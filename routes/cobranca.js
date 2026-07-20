'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');

// ── POST /api/pacientes/:id/cobrar-email ──
router.post('/:id/cobrar-email', verifyToken, async (req, res) => {
  try {
    var pid = parseInt(req.params.id);

    // Buscar dados do paciente
    var pacRes = await db.query('SELECT * FROM pacientes WHERE id=$1', [pid]);
    if (!pacRes.rows.length) return res.status(404).json({ message: 'Paciente não encontrado.' });
    var paciente = pacRes.rows[0];

    if (!paciente.email) return res.status(400).json({ message: 'Paciente não possui email cadastrado.' });

    // Buscar dados do terapeuta
    var terapeutaId = req.user && req.user.id;
    var terRes = await db.query('SELECT nome, telefone, pix_tipo, pix_chave FROM terapeutas WHERE id=$1', [terapeutaId]);
    var terapeuta = terRes.rows[0] || {};

    // Buscar sessões em aberto (realizadas e não pagas)
    var sesRes = await db.query(
      `SELECT sessao_numero, data_sessao, valor_cobrado
       FROM sessoes
       WHERE paciente_id=$1 AND status='realizada' AND pago=false
       ORDER BY data_sessao ASC`,
      [pid]
    );
    var sessoesAbertas = sesRes.rows;

    if (!sessoesAbertas.length) {
      return res.status(400).json({ message: 'Paciente não possui sessões em aberto.' });
    }

    // Buscar última sessão realizada
    var ultRes = await db.query(
      `SELECT data_sessao FROM sessoes
       WHERE paciente_id=$1 AND status='realizada'
       ORDER BY data_sessao DESC LIMIT 1`,
      [pid]
    );
    var ultimaSessao = ultRes.rows[0] ? new Date(ultRes.rows[0].data_sessao) : null;
    var diasAfastado = ultimaSessao
      ? Math.floor((new Date() - ultimaSessao) / (1000 * 60 * 60 * 24))
      : null;

    // Calcular total em aberto
    var totalAberto = sessoesAbertas.reduce(function(acc, s) {
      return acc + parseFloat(s.valor_cobrado || 0);
    }, 0);

    // Montar WhatsApp
    var telBruto = (terapeuta.telefone || '').replace(/\D/g, '');
    var wppNum = telBruto.startsWith('55') ? telBruto : '55' + telBruto;
    var wppUrl = 'https://wa.me/' + wppNum;

    // Agenda
    var agendaUrl = 'https://terapiaevolutiva.belleplanner.com.br';

    // Pix
    var pixLabel = terapeuta.pix_tipo
      ? terapeuta.pix_tipo.charAt(0).toUpperCase() + terapeuta.pix_tipo.slice(1)
      : 'Pix';
    var pixChave = terapeuta.pix_chave || 'Não cadastrado';

    // Formatar data pt-BR
    function fmtData(d) {
      if (!d) return '—';
      var dt = new Date(d);
      return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    }

    // Linhas de sessões abertas
    var sessoesLinhas = sessoesAbertas.map(function(s) {
      return '<tr>'
        + '<td style="padding:8px 12px;border-bottom:1px solid rgba(212,175,127,.1)">Sessão ' + s.sessao_numero + '</td>'
        + '<td style="padding:8px 12px;border-bottom:1px solid rgba(212,175,127,.1);color:#C9D1D9">' + fmtData(s.data_sessao) + '</td>'
        + '<td style="padding:8px 12px;border-bottom:1px solid rgba(212,175,127,.1);color:#D4AF7F;font-weight:700;text-align:right">'
        + 'R$ ' + parseFloat(s.valor_cobrado || 0).toFixed(2).replace('.', ',') + '</td>'
        + '</tr>';
    }).join('');

    var totalFmt = 'R$ ' + totalAberto.toFixed(2).replace('.', ',');
    var ultimaDataFmt = fmtData(ultimaSessao);
    var primoNome = paciente.nome_completo.split(' ')[0];

    // ── HTML DO EMAIL ──
    var html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0B132B;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;background:#0B132B">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1C2541,#0B132B);padding:36px 32px 24px;text-align:center;border-bottom:2px solid rgba(212,175,127,.3)">
      <div style="font-size:22px;font-weight:800;color:#D4AF7F;letter-spacing:2px;text-transform:uppercase">SYNAPSE CORE</div>
      <div style="font-size:11px;color:#C9D1D9;letter-spacing:3px;margin-top:4px;text-transform:uppercase">Evolution Therapy · Inteligência Clínica</div>
    </div>

    <!-- Saudação -->
    <div style="padding:32px 32px 0">
      <p style="font-size:17px;font-weight:700;color:#F5F7FA;margin:0 0 8px">Olá, ${primoNome} 👋</p>
      <p style="font-size:14px;color:#C9D1D9;line-height:1.7;margin:0">
        Esperamos que esteja bem! Verificamos nosso sistema e identificamos que você possui
        ${sessoesAbertas.length === 1 ? 'uma sessão pendente' : sessoesAbertas.length + ' sessões pendentes'} de pagamento.
        ${diasAfastado !== null ? 'Sua última sessão foi realizada em <strong style="color:#D4AF7F">' + ultimaDataFmt + '</strong> — há <strong style="color:#D4AF7F">' + diasAfastado + ' dias</strong>.' : ''}
      </p>
    </div>

    <!-- Sessões em aberto -->
    <div style="padding:24px 32px 0">
      <div style="font-size:12px;font-weight:700;color:#D4AF7F;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">Sessões em aberto</div>
      <table style="width:100%;border-collapse:collapse;background:rgba(28,37,65,.6);border-radius:10px;overflow:hidden;border:1px solid rgba(212,175,127,.15)">
        <thead>
          <tr style="background:rgba(212,175,127,.08)">
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#D4AF7F;font-weight:700;letter-spacing:1px;text-transform:uppercase">Sessão</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#D4AF7F;font-weight:700;letter-spacing:1px;text-transform:uppercase">Data</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;color:#D4AF7F;font-weight:700;letter-spacing:1px;text-transform:uppercase">Valor</th>
          </tr>
        </thead>
        <tbody style="color:#F5F7FA;font-size:13px">
          ${sessoesLinhas}
          <tr style="background:rgba(212,175,127,.06)">
            <td colspan="2" style="padding:10px 12px;font-weight:700;color:#F5F7FA;font-size:13px">Total em aberto</td>
            <td style="padding:10px 12px;font-weight:800;color:#D4AF7F;font-size:15px;text-align:right">${totalFmt}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pix -->
    <div style="padding:20px 32px 0">
      <div style="background:rgba(28,37,65,.8);border:1px solid rgba(212,175,127,.2);border-radius:10px;padding:16px 20px">
        <div style="font-size:12px;color:#D4AF7F;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">💰 Chave Pix para pagamento</div>
        <div style="font-size:13px;color:#C9D1D9;margin-bottom:4px">${pixLabel}: <strong style="color:#F5F7FA">${pixChave}</strong></div>
        <div style="font-size:12px;color:#C9D1D9;margin-top:6px">Após o pagamento, nos envie o comprovante pelo WhatsApp.</div>
      </div>
    </div>

    <!-- CTAs -->
    <div style="padding:24px 32px 0;display:flex;gap:12px;flex-wrap:wrap">
      <a href="${agendaUrl}" style="display:inline-block;background:linear-gradient(135deg,#D4AF7F,#b8924e);color:#0B132B;font-weight:800;font-size:13px;padding:12px 24px;border-radius:8px;text-decoration:none;letter-spacing:.5px">📅 Agendar próxima sessão</a>
      <a href="${wppUrl}" style="display:inline-block;background:rgba(212,175,127,.12);border:1px solid rgba(212,175,127,.35);color:#D4AF7F;font-weight:700;font-size:13px;padding:12px 24px;border-radius:8px;text-decoration:none;letter-spacing:.5px">💬 Falar pelo WhatsApp</a>
    </div>

    <!-- Mensagem final -->
    <div style="padding:24px 32px 0">
      <p style="font-size:13px;color:#C9D1D9;line-height:1.7;margin:0">
        Sentimos sua falta e estamos aqui para apoiar sua jornada de desenvolvimento.
        Qualquer dúvida, entre em contato — ficaremos felizes em ajudar. 💛
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:28px 32px 32px;text-align:center;margin-top:24px;border-top:1px solid rgba(212,175,127,.1)">
      <div style="font-size:11px;color:rgba(201,209,217,.4);line-height:1.8">
        Evolution Therapy · Erick Torritezi<br>
        Este é um email automático gerado pelo Synapse Core.<br>
        Por favor, não responda diretamente a este email.
      </div>
    </div>

  </div>
</body>
</html>`;

    // ── DISPARAR VIA RESEND ──
    var resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return res.status(500).json({ message: 'RESEND_API_KEY não configurada.' });

    var resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + resendKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Synapse Core <noreply@belleplanner.com.br>',
        to:   [paciente.email],
        subject: '💛 Olá ' + primoNome + ' — Sessões pendentes · Evolution Therapy',
        html: html
      })
    });

    var resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('cobranca/email Resend erro:', resendData);
      return res.status(500).json({ message: 'Erro ao enviar email: ' + (resendData.message || resendRes.status) });
    }

    console.log('cobranca/email enviado para:', paciente.email, '| id:', resendData.id);
    res.json({ ok: true, email: paciente.email, total: totalFmt, sessoes: sessoesAbertas.length });

  } catch (err) {
    console.error('cobranca/email:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
