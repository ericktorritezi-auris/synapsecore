const express = require('express');
const db      = require('../db');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

// GET /api/pacientes
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, tipo, status } = req.query;
    const params = [];
    let where = status === 'inativo'
      ? `WHERE p.status = 'inativo'`
      : status === 'pendente'
        ? `WHERE p.status = 'pendente'`
        : `WHERE p.status = 'ativo'`;
    if (search) {
      params.push(`%${search}%`);
      const n = params.length;
      where += ` AND (p.nome_completo ILIKE $${n} OR p.email ILIKE $${n})`;
    }
    if (tipo && status !== 'inativo' && status !== 'pendente') {
      params.push(tipo);
      where += ` AND p.perfil_tipo = $${params.length}`;
    }
    const result = await db.query(`
      SELECT p.id, p.nome_completo, p.data_nascimento, p.genero, p.email,
             p.telefone, p.perfil_tipo, p.eh_neurodivergente, p.foto_url,
             p.status, p.created_at, p.pacote_id, p.programa_sessao_atual, p.casal_id,
             CASE WHEN p.data_nascimento IS NOT NULL
               THEN DATE_PART('year', AGE(p.data_nascimento))::int ELSE NULL END AS idade,
             pk.nome AS pacote_nome, pk.qtd_sessoes,
             (SELECT COUNT(*) FROM sessoes s WHERE s.paciente_id = p.id AND s.status = 'realizada')::int AS sessoes_realizadas,
             (SELECT COUNT(*) FROM mapeamentos m WHERE m.paciente_id = p.id)::int AS total_mapeamentos,
             (SELECT COUNT(*) FROM form_tokens ft
               WHERE ft.paciente_id = p.id AND ft.usado = false AND ft.expira_em > NOW())::int AS link_ativo,
             p.sessoes_anteriores
      FROM pacientes p
      LEFT JOIN pacotes pk ON pk.id = p.pacote_id
      ${where}
      ORDER BY p.created_at DESC
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /pacientes:', err.message);
    res.status(500).json({ message: 'Erro ao buscar pacientes.' });
  }
});

// POST /api/pacientes
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      nome_completo, data_nascimento, genero, email, telefone,
      cpf, rg, pais, endereco_completo, cidade, cep, foto_url,
      perfil_tipo, eh_neurodivergente, diagnostico_neurodiv,
      motivo_busca, pacote_id, observacoes, sessoes_anteriores, data_primeira_sessao,
      conjuge_nome, conjuge_data_nascimento, conjuge_genero, conjuge_email, conjuge_telefone, conjuge_cpf,
      responsavel_nome, responsavel_cpf, responsavel_email, responsavel_telefone
    } = req.body;
    if (!nome_completo || !nome_completo.trim())
      return res.status(400).json({ message: 'Nome completo é obrigatório.' });
    if (data_nascimento) {
      const dob = new Date(data_nascimento);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      if (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate())) age--;
      if (age < 13) return res.status(400).json({ message: 'Pacientes com menos de 13 anos não são atendidos nesta plataforma.' });
    }
    const result = await db.query(`
      INSERT INTO pacientes (
        nome_completo, data_nascimento, genero, email, telefone,
        cpf, rg, pais, endereco_completo, cidade, cep, foto_url,
        perfil_tipo, eh_neurodivergente, diagnostico_neurodiv,
        motivo_busca, pacote_id, observacoes, sessoes_anteriores, data_primeira_sessao
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *
    `, [
      nome_completo.trim(), data_nascimento||null, genero||null, email||null, telefone||null,
      cpf||null, rg||null, pais||'Brasil', endereco_completo||null, cidade||null, cep||null, foto_url||null,
      perfil_tipo||'adulto', eh_neurodivergente||false, diagnostico_neurodiv||null,
      motivo_busca||null, pacote_id||null, observacoes||null,
      parseInt(sessoes_anteriores)||0, data_primeira_sessao||null
    ]);
    const paciente = result.rows[0];
    if (perfil_tipo === 'casal' && conjuge_nome) {
      const conj = await db.query(`
        INSERT INTO pacientes (nome_completo, data_nascimento, genero, email, telefone, cpf, pais, perfil_tipo)
        VALUES ($1,$2,$3,$4,$5,$6,'Brasil','casal') RETURNING id
      `, [conjuge_nome.trim(), conjuge_data_nascimento||null, conjuge_genero||null, conjuge_email||null, conjuge_telefone||null, conjuge_cpf||null]);
      const casal = await db.query(
        `INSERT INTO casais (paciente_1_id, paciente_2_id, status) VALUES ($1,$2,'ativo') RETURNING id`,
        [paciente.id, conj.rows[0].id]
      );
      await db.query(`UPDATE pacientes SET casal_id = $1 WHERE id = ANY($2::int[])`,
        [casal.rows[0].id, [paciente.id, conj.rows[0].id]]);
    }
    if (perfil_tipo === 'adolescente' && responsavel_nome) {
      const resp = await db.query(`
        INSERT INTO pacientes (nome_completo, cpf, email, telefone, pais, perfil_tipo, status)
        VALUES ($1,$2,$3,$4,'Brasil','responsavel','responsavel') RETURNING id
      `, [responsavel_nome.trim(), responsavel_cpf||null, responsavel_email||null, responsavel_telefone||null]);
      await db.query(`UPDATE pacientes SET responsavel_id = $1 WHERE id = $2`, [resp.rows[0].id, paciente.id]);
    }
    res.status(201).json(paciente);
  } catch (err) {
    console.error('POST /pacientes:', err.message);
    res.status(500).json({ message: 'Erro ao criar paciente.' });
  }
});

// GET /api/pacientes/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT p.*,
        CASE WHEN p.data_nascimento IS NOT NULL
          THEN DATE_PART('year', AGE(p.data_nascimento))::int ELSE NULL END AS idade,
        pk.nome AS pacote_nome, pk.qtd_sessoes, pk.sessoes_json,
        (SELECT COUNT(*) FROM sessoes s WHERE s.paciente_id = p.id)::int AS total_sessoes,
        (SELECT COUNT(*) FROM mapeamentos m WHERE m.paciente_id = p.id)::int AS total_mapeamentos,
        (SELECT COUNT(*) FROM form_tokens ft
          WHERE ft.paciente_id = p.id AND ft.usado = false AND ft.expira_em > NOW())::int AS link_ativo
      FROM pacientes p LEFT JOIN pacotes pk ON pk.id = p.pacote_id
      WHERE p.id = $1
    `, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Paciente não encontrado.' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar paciente.' });
  }
});

// PUT /api/pacientes/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const fields = ['nome_completo','data_nascimento','genero','email','telefone','cpf','rg','pais',
      'endereco_completo','cidade','cep','foto_url','perfil_tipo','eh_neurodivergente',
      'diagnostico_neurodiv','motivo_busca','pacote_id','observacoes','sessoes_anteriores',
      'data_primeira_sessao','status'];
    const updates = []; const values = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) { values.push(req.body[f]); updates.push(`${f} = $${values.length}`); }
    });
    if (!updates.length) return res.status(400).json({ message: 'Nada para atualizar.' });
    values.push(req.params.id);
    await db.query(`UPDATE pacientes SET ${updates.join(',')}, updated_at = NOW() WHERE id = $${values.length}`, values);
    res.json({ message: 'Paciente atualizado.' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar.' });
  }
});

// POST /api/pacientes/:id/gerar-link
router.post('/:id/gerar-link', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const dias = parseInt(req.body.dias_validade) || 7;
    const pac = await db.query('SELECT id, nome_completo FROM pacientes WHERE id = $1', [id]);
    if (!pac.rows.length) return res.status(404).json({ message: 'Paciente não encontrado.' });
    await db.query(`UPDATE form_tokens SET usado = true WHERE paciente_id = $1 AND usado = false`, [id]);
    const expira = new Date();
    expira.setDate(expira.getDate() + dias);
    const tok = await db.query(
      `INSERT INTO form_tokens (paciente_id, expira_em) VALUES ($1, $2) RETURNING token`, [id, expira]
    );
    const token = tok.rows[0].token;
    const base  = (process.env.BASE_URL || 'https://www.synapsecore.app.br').replace(/\/+$/, '');
    res.json({ link: `${base}/anamnese/${token}`, token, expira_em: expira, paciente_nome: pac.rows[0].nome_completo });
  } catch (err) {
    console.error('gerar-link:', err.message);
    res.status(500).json({ message: 'Erro ao gerar link.' });
  }
});

module.exports = router;
