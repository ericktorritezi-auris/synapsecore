// ══════════════════════════════════════════════
// SYNAPSE CORE — GERADOR DE ALERTAS (sem IA)
// v3.3.0 — Fase A
// ══════════════════════════════════════════════
const db = require('../db');

// ── Helper: upsert alerta (evita duplicatas por paciente+tipo)
async function upsertAlerta({ tipo, prioridade, titulo, corpo, paciente_id, acao_tipo, acao_url, acao_whatsapp }) {
  // Check if active alert of this type+patient already exists
  const existing = await db.query(
    `SELECT id, lido, lido_em, lembrar_depois FROM alertas
     WHERE tipo=$1 AND paciente_id=$2 AND resolvido=false LIMIT 1`,
    [tipo, paciente_id]
  );

  if (existing.rows.length) {
    const row = existing.rows[0];
    // If already read less than 7 days ago — don't reactivate yet
    if (row.lido && row.lido_em) {
      const diasDesde = (Date.now() - new Date(row.lido_em).getTime()) / (1000 * 60 * 60 * 24);
      if (diasDesde < 7) return; // still within 7-day cooldown
      // 7+ days — reactivate
      await db.query(
        'UPDATE alertas SET lido=false, lido_em=NULL, lembrar_depois=false, lembrar_em=NULL, titulo=$1, corpo=$2, gerado_em=NOW() WHERE id=$3',
        [titulo, corpo || null, row.id]
      );
    }
    // else: already active unread — just update content if changed
    else {
      await db.query(
        'UPDATE alertas SET titulo=$1, corpo=$2 WHERE id=$3',
        [titulo, corpo || null, row.id]
      );
    }
    return;
  }

  // Create new alert
  await db.query(
    `INSERT INTO alertas (tipo, prioridade, titulo, corpo, paciente_id, acao_tipo, acao_url, acao_whatsapp)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [tipo, prioridade, titulo, corpo || null, paciente_id || null,
     acao_tipo || null, acao_url || null, acao_whatsapp || null]
  );
}

// ── Helper: resolver alerta quando condição não existe mais
async function resolverAlerta(tipo, paciente_id) {
  await db.query(
    'UPDATE alertas SET resolvido=true WHERE tipo=$1 AND paciente_id=$2 AND resolvido=false',
    [tipo, paciente_id]
  );
}

// ── Formatar telefone para WhatsApp
function fmtWpp(telefone) {
  if (!telefone) return null;
  var t = telefone.replace(/\D/g, '');
  if (!t.startsWith('55')) t = '55' + t;
  return t;
}

// ══════════════════════════════════════════════
// GERADORES POR TIPO
// ══════════════════════════════════════════════

// 3.1 — Aniversariantes da semana
async function gerarAniversarios() {
  try {
    const r = await db.query(`
      SELECT id, nome_completo, telefone, data_nascimento
      FROM pacientes
      WHERE status = 'ativo'
        AND data_nascimento IS NOT NULL
        AND (
          TO_CHAR(data_nascimento, 'MM-DD') >= TO_CHAR(NOW(), 'MM-DD')
          AND TO_CHAR(data_nascimento, 'MM-DD') <= TO_CHAR(NOW() + INTERVAL '7 days', 'MM-DD')
        )
    `);

    for (var p of r.rows) {
      var nasc = new Date(p.data_nascimento);
      var hoje = new Date();
      var aniversario = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
      var diasAte = Math.round((aniversario - hoje) / (1000 * 60 * 60 * 24));
      var titulo, corpo;
      if (diasAte === 0) {
        titulo = '🎂 ' + p.nome_completo.split(' ')[0] + ' faz aniversário HOJE!';
        corpo  = 'Uma ótima oportunidade para um contato especial.';
      } else {
        titulo = '🎂 ' + p.nome_completo.split(' ')[0] + ' faz aniversário em ' + diasAte + ' dia' + (diasAte > 1 ? 's' : '');
        corpo  = 'Data: ' + aniversario.toLocaleDateString('pt-BR');
      }
      await upsertAlerta({
        tipo: 'aniversario_' + p.id,
        prioridade: 'informativo',
        titulo,
        corpo,
        paciente_id: p.id,
        acao_tipo: 'paciente',
        acao_url: '/sessoes/' + p.id,
        acao_whatsapp: fmtWpp(p.telefone)
      });
    }
  } catch(e) { console.error('gerarAniversarios:', e.message); }
}

// 3.2 — Paciente sem sessão recente
async function gerarSemSessao() {
  try {
    const pacientes = await db.query(
      "SELECT id, nome_completo, telefone FROM pacientes WHERE status='ativo'"
    );
    for (var p of pacientes.rows) {
      const ultima = await db.query(
        "SELECT MAX(data_sessao) AS ultima FROM sessoes WHERE paciente_id=$1 AND status='realizada'",
        [p.id]
      );
      var ultimaData = ultima.rows[0].ultima;

      if (!ultimaData) {
        // Check if has any session at all — if never had a session, skip (handled by 3.9)
        await resolverAlerta('sem_sessao', p.id);
        continue;
      }

      var dias = Math.floor((Date.now() - new Date(ultimaData).getTime()) / (1000 * 60 * 60 * 24));
      var primeiroNome = p.nome_completo.split(' ')[0];

      if (dias >= 21) {
        await upsertAlerta({
          tipo: 'sem_sessao', prioridade: 'critico',
          titulo: '⚠️ ' + primeiroNome + ' está há ' + dias + ' dias sem sessão',
          corpo: 'Último atendimento: ' + new Date(ultimaData).toLocaleDateString('pt-BR') + '. Risco de abandono elevado.',
          paciente_id: p.id, acao_tipo: 'paciente',
          acao_url: '/sessoes/' + p.id, acao_whatsapp: fmtWpp(p.telefone)
        });
      } else if (dias >= 15) {
        await upsertAlerta({
          tipo: 'sem_sessao', prioridade: 'atencao',
          titulo: '⚠️ ' + primeiroNome + ' está há ' + dias + ' dias sem sessão',
          corpo: 'Último atendimento: ' + new Date(ultimaData).toLocaleDateString('pt-BR') + '. Considere entrar em contato.',
          paciente_id: p.id, acao_tipo: 'paciente',
          acao_url: '/sessoes/' + p.id, acao_whatsapp: fmtWpp(p.telefone)
        });
      } else if (dias >= 10) {
        await upsertAlerta({
          tipo: 'sem_sessao', prioridade: 'operacional',
          titulo: '⚠️ ' + primeiroNome + ' está há ' + dias + ' dias sem sessão',
          corpo: 'Último atendimento: ' + new Date(ultimaData).toLocaleDateString('pt-BR') + '.',
          paciente_id: p.id, acao_tipo: 'paciente',
          acao_url: '/sessoes/' + p.id, acao_whatsapp: fmtWpp(p.telefone)
        });
      } else {
        // Condition resolved
        await resolverAlerta('sem_sessao', p.id);
      }
    }
  } catch(e) { console.error('gerarSemSessao:', e.message); }
}

// 3.3 — Sessões sem pagamento
async function gerarPagamentoPendente() {
  try {
    const r = await db.query(`
      SELECT p.id, p.nome_completo, p.telefone,
             COUNT(s.id) AS qtd,
             COALESCE(SUM(s.valor_cobrado), 0) AS total
      FROM pacientes p
      JOIN sessoes s ON s.paciente_id = p.id
      WHERE p.status = 'ativo'
        AND s.status = 'realizada'
        AND s.pago = false
        AND s.valor_cobrado > 0
      GROUP BY p.id, p.nome_completo, p.telefone
      HAVING COUNT(s.id) >= 1
    `);

    // Get all active patients to resolve alerts for those now fully paid
    const todos = await db.query("SELECT id FROM pacientes WHERE status='ativo'");
    for (var t of todos.rows) {
      var temPendente = r.rows.find(function(row){ return row.id === t.id; });
      if (!temPendente) await resolverAlerta('pagamento_pendente', t.id);
    }

    for (var p of r.rows) {
      var qtd   = parseInt(p.qtd);
      var total = parseFloat(p.total).toFixed(2).replace('.', ',');
      var primeiroNome = p.nome_completo.split(' ')[0];
      await upsertAlerta({
        tipo: 'pagamento_pendente', prioridade: 'atencao',
        titulo: '💰 ' + primeiroNome + ' — ' + qtd + ' sessão' + (qtd > 1 ? 'ões' : '') + ' pendente' + (qtd > 1 ? 's' : ''),
        corpo: 'Valor total em aberto: R$ ' + total,
        paciente_id: p.id, acao_tipo: 'financeiro',
        acao_url: '/financeiro', acao_whatsapp: fmtWpp(p.telefone)
      });
    }
  } catch(e) { console.error('gerarPagamentoPendente:', e.message); }
}

// 3.6 — Paciente sem feedback recente
async function gerarSemFeedback() {
  try {
    const pacientes = await db.query(
      "SELECT id, nome_completo, telefone FROM pacientes WHERE status='ativo'"
    );
    for (var p of pacientes.rows) {
      // Only check patients with at least 3 sessions
      const sessCount = await db.query(
        "SELECT COUNT(*) AS c FROM sessoes WHERE paciente_id=$1 AND status='realizada'",
        [p.id]
      );
      if (parseInt(sessCount.rows[0].c) < 3) { await resolverAlerta('sem_feedback', p.id); continue; }

      const ultimo = await db.query(
        'SELECT MAX(data_feedback) AS ultima FROM feedbacks_paciente WHERE paciente_id=$1',
        [p.id]
      ).catch(function(){ return { rows:[{ultima:null}] }; });

      var ultimaData = ultimo.rows[0].ultima;
      var dias = ultimaData
        ? Math.floor((Date.now() - new Date(ultimaData).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      var primeiroNome = p.nome_completo.split(' ')[0];

      if (dias >= 30) {
        await upsertAlerta({
          tipo: 'sem_feedback', prioridade: 'atencao',
          titulo: '📝 ' + primeiroNome + ' sem feedback há ' + (dias < 999 ? dias + ' dias' : 'mais de 30 dias'),
          corpo: 'Considere solicitar um feedback sobre o processo terapêutico.',
          paciente_id: p.id, acao_tipo: 'paciente',
          acao_url: '/sessoes/' + p.id, acao_whatsapp: fmtWpp(p.telefone)
        });
      } else if (dias >= 20) {
        await upsertAlerta({
          tipo: 'sem_feedback', prioridade: 'operacional',
          titulo: '📝 ' + primeiroNome + ' sem feedback há ' + dias + ' dias',
          corpo: 'Último feedback registrado há ' + dias + ' dias.',
          paciente_id: p.id, acao_tipo: 'paciente',
          acao_url: '/sessoes/' + p.id, acao_whatsapp: null
        });
      } else {
        await resolverAlerta('sem_feedback', p.id);
      }
    }
  } catch(e) { console.error('gerarSemFeedback:', e.message); }
}

// 3.9 — Sem retorno após primeira sessão
async function gerarSemRetorno() {
  try {
    const r = await db.query(`
      SELECT p.id, p.nome_completo, p.telefone,
             MIN(s.data_sessao) AS primeira_sessao,
             COUNT(s.id) AS total_sessoes
      FROM pacientes p
      JOIN sessoes s ON s.paciente_id = p.id AND s.status = 'realizada'
      WHERE p.status = 'ativo'
      GROUP BY p.id, p.nome_completo, p.telefone
      HAVING COUNT(s.id) = 1
    `);

    for (var p of r.rows) {
      var dias = Math.floor((Date.now() - new Date(p.primeira_sessao).getTime()) / (1000 * 60 * 60 * 24));
      if (dias >= 10) {
        var primeiroNome = p.nome_completo.split(' ')[0];
        await upsertAlerta({
          tipo: 'sem_retorno', prioridade: 'atencao',
          titulo: '🔄 ' + primeiroNome + ' não retornou após a 1ª sessão',
          corpo: 'Primeira sessão: ' + new Date(p.primeira_sessao).toLocaleDateString('pt-BR') + ' (' + dias + ' dias atrás). Nenhuma nova sessão registrada.',
          paciente_id: p.id, acao_tipo: 'paciente',
          acao_url: '/sessoes/' + p.id, acao_whatsapp: fmtWpp(p.telefone)
        });
      } else {
        await resolverAlerta('sem_retorno', p.id);
      }
    }
    // Resolve for patients who now have 2+ sessions
    const comRetorno = await db.query(`
      SELECT DISTINCT paciente_id FROM sessoes
      WHERE status = 'realizada'
      GROUP BY paciente_id HAVING COUNT(*) >= 2
    `);
    for (var c of comRetorno.rows) {
      await resolverAlerta('sem_retorno', c.paciente_id);
    }
  } catch(e) { console.error('gerarSemRetorno:', e.message); }
}

// ══════════════════════════════════════════════
// EXECUTOR PRINCIPAL
// ══════════════════════════════════════════════
async function gerarTodosAlertas() {
  try {
    await Promise.all([
      gerarAniversarios(),
      gerarSemSessao(),
      gerarPagamentoPendente(),
      gerarSemFeedback(),
      gerarSemRetorno()
    ]);
  } catch(e) {
    console.error('gerarTodosAlertas:', e.message);
  }
}

module.exports = { gerarTodosAlertas };
