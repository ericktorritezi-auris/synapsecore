const express = require('express');
const db      = require('../db');
const router  = express.Router();

// POST /api/cadastro — público, sem auth
router.post('/', async (req, res) => {
  try {
    const {
      nome_completo, data_nascimento, genero, cpf, rg,
      email, telefone, whatsapp, cidade, estado,
      perfil_tipo, motivo_busca,
      responsavel_nome, responsavel_telefone, responsavel_email
    } = req.body;

    if (!nome_completo || !nome_completo.trim()) {
      return res.status(400).json({ message: 'Nome completo é obrigatório.' });
    }

    // Detectar se é menor de idade
    var menor = false;
    if (data_nascimento) {
      var nasc = new Date(data_nascimento);
      var hoje = new Date();
      var idade = hoje.getFullYear() - nasc.getFullYear();
      var m = hoje.getMonth() - nasc.getMonth();
      if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
      menor = idade < 18;
    }

    if (menor && !responsavel_nome) {
      return res.status(400).json({ message: 'Nome do responsável é obrigatório para menores de 18 anos.' });
    }

    // Montar endereço
    var endereco = [cidade, estado].filter(Boolean).join(', ');

    // Telefone principal: usa whatsapp se não tiver telefone
    var tel = telefone || whatsapp || null;

    // Inserir paciente
    const result = await db.query(
      `INSERT INTO pacientes
        (nome_completo, data_nascimento, genero, cpf, rg, email, telefone,
         cidade, perfil_tipo, motivo_busca,
         responsavel_nome, responsavel_telefone, responsavel_email,
         status, observacoes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pendente',$14,NOW(),NOW())
       RETURNING id, nome_completo`,
      [
        nome_completo.trim(),
        data_nascimento || null,
        genero || null,
        cpf || null,
        rg || null,
        email || null,
        tel,
        cidade || null,
        perfil_tipo || 'adulto',
        motivo_busca || null,
        responsavel_nome || null,
        responsavel_telefone || null,
        responsavel_email || null,
        whatsapp ? 'WhatsApp: ' + whatsapp : null
      ]
    );

    const paciente = result.rows[0];

    // Disparar push notification para o terapeuta (background, não bloqueia resposta)
    notificarTerapeuta(paciente.nome_completo, paciente.id).catch(function(e) {
      console.warn('Push cadastro falhou:', e.message);
    });

    res.json({
      success: true,
      message: 'Seus dados foram recebidos com sucesso. Em breve você receberá o formulário de avaliação.',
      id: paciente.id
    });
  } catch(e) {
    console.error('cadastro público:', e.message);
    res.status(500).json({ message: 'Erro ao salvar cadastro. Tente novamente.' });
  }
});

async function notificarTerapeuta(nome, pacienteId) {
  try {
    const subs = await db.query('SELECT * FROM push_subscriptions LIMIT 5');
    if (!subs.rows.length) return;

    const webpush = require('web-push');
    webpush.setVapidDetails(
      'mailto:' + (process.env.VAPID_EMAIL || 'contato@synapsecore.app.br'),
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    var payload = JSON.stringify({
      title: '📋 Novo Cadastro',
      body: nome + ' preencheu o formulário de cadastro.',
      url: '/pacientes'
    });

    for (var sub of subs.rows) {
      try {
        // Build subscription object from individual columns
        var subscriptionObj = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        await webpush.sendNotification(subscriptionObj, payload);
      } catch(e) {
        console.warn('Push sub falhou:', e.message);
      }
    }
  } catch(e) {
    console.warn('notificarTerapeuta:', e.message);
  }
}

module.exports = router;
