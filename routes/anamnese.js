const express = require('express');
const crypto  = require('crypto');
const db      = require('../db');
const router  = express.Router();

// ── GET /api/anamnese/:token — valida token
router.get('/:token', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT ft.id, ft.expira_em, p.nome_completo, p.perfil_tipo
       FROM form_tokens ft
       JOIN pacientes p ON p.id = ft.paciente_id
       WHERE ft.token = $1 AND ft.usado = false AND ft.expira_em > NOW()`,
      [req.params.token]
    );
    if (!r.rows.length) return res.status(404).json({ valido: false, message: 'Link inválido ou expirado.' });
    const row = r.rows[0];
    const primeiroNome = row.nome_completo.split(' ')[0];
    res.json({ valido: true, nome: primeiroNome, perfil_tipo: row.perfil_tipo });
  } catch (err) {
    console.error('GET /api/anamnese:', err.message);
    res.status(500).json({ valido: false, message: 'Erro interno.' });
  }
});

// ── POST /api/anamnese/:token — submete respostas
router.post('/:token', async (req, res) => {
  try {
    const { respostas, marcadores, lgpd_aceito, lgpd_ia_aceito } = req.body;

    if (!lgpd_aceito) return res.status(400).json({ message: 'Consentimento LGPD é obrigatório.' });

    const tokR = await db.query(
      `SELECT ft.id, ft.paciente_id FROM form_tokens ft
       WHERE ft.token = $1 AND ft.usado = false AND ft.expira_em > NOW()`,
      [req.params.token]
    );
    if (!tokR.rows.length) return res.status(400).json({ message: 'Token inválido ou já utilizado.' });

    const { id: token_id, paciente_id } = tokR.rows[0];

    // Classificação de risco
    const { nivel, flags } = classificarRisco(respostas || {});

    // Salva respostas
    await db.query(
      `INSERT INTO respostas_formulario
         (paciente_id, token_id, respostas_json, marcadores_json, risco_nivel, risco_flags, concluido)
       VALUES ($1,$2,$3,$4,$5,$6,true)`,
      [paciente_id, token_id,
       JSON.stringify(respostas || {}),
       JSON.stringify(marcadores || {}),
       nivel, JSON.stringify(flags)]
    );

    // Log LGPD
    const pac = await db.query('SELECT nome_completo, cpf FROM pacientes WHERE id = $1', [paciente_id]);
    const termoTexto = 'SYNAPSE CORE LGPD v1.0 — ' + new Date().toISOString().split('T')[0];
    const hashDoc    = crypto.createHash('sha256').update(termoTexto).digest('hex');

    await db.query(
      `INSERT INTO lgpd_logs
         (paciente_id, paciente_nome, paciente_cpf, lgpd_aceito, lgpd_ia_aceito,
          ip_origem, user_agent, versao_termo, hash_documento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'1.0',$8)`,
      [paciente_id,
       pac.rows[0]?.nome_completo || '',
       pac.rows[0]?.cpf || '',
       true, lgpd_ia_aceito || false,
       req.ip || '', req.headers['user-agent'] || '',
       hashDoc]
    );

    // Marca token como usado
    await db.query('UPDATE form_tokens SET usado = true WHERE id = $1', [token_id]);

    // Notifica no banco que há resposta pendente de análise
    await db.query(
      'UPDATE pacientes SET updated_at = NOW() WHERE id = $1', [paciente_id]
    );

    res.json({ sucesso: true, risco_nivel: nivel });
  } catch (err) {
    console.error('POST /api/anamnese:', err.message);
    res.status(500).json({ message: 'Erro ao salvar respostas.' });
  }
});

// ── Classificação de risco
function classificarRisco(r) {
  var flags = [];
  var nivel = 'verde';
  var amarelo = 0;

  function addVermelho(q) { nivel = 'vermelho'; flags.push({ q: q, nivel: 'vermelho' }); }
  function addAmarelo(q, extra) { amarelo++; flags.push(Object.assign({ q: q, nivel: 'amarelo' }, extra || {})); }

  // S1 - Ideação suicida
  if (r.S1 === 'sim')      addVermelho('S1');
  else if (r.S1 === 'av')  addAmarelo('S1');

  // S2 - Autoagressão
  if (r.S2 === 'rec')       addVermelho('S2');
  else if (r.S2 === 'pass') addAmarelo('S2');

  // S3 - Violência
  if (r.S3 === 'sim')      addVermelho('S3');
  else if (r.S3 === 'av')  addAmarelo('S3');

  // S4 - Abuso
  if (r.S4 === 'atual')    addVermelho('S4');
  else if (r.S4 === 'pass' || r.S4 === 'pnr') addAmarelo('S4');

  // S5 - Mania
  if (r.S5 === 'sv' || r.S5 === 'su') addAmarelo('S5', { psiq: true });

  // S6 - Psicose
  if (r.S6 === 'sf')       addVermelho('S6');
  else if (r.S6 === 'sj')  addAmarelo('S6', { psiq: true });

  // S7 - Substâncias
  if (r.S7 === 'd')         addVermelho('S7');
  else if (r.S7 === 'f' || r.S7 === 'av') addAmarelo('S7');

  // S8 - Risco iminente
  if (r.S8 === 'eu' || r.S8 === 'alg') addVermelho('S8');
  else if (r.S8 === 'ns')  addAmarelo('S8');

  // 3+ amarelos → vermelho
  if (nivel !== 'vermelho' && amarelo >= 3) nivel = 'vermelho';
  else if (nivel === 'verde' && amarelo > 0) nivel = 'amarelo';

  return { nivel: nivel, flags: flags };
}

module.exports = router;
