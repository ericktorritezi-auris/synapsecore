// ══════════════════════════════════════════════
// CRON DE ALERTAS — roda a cada hora
// Zero IA. Apenas queries PostgreSQL.
// ══════════════════════════════════════════════

const db = require('../db');

// ── HELPER: upsert alerta ──
// Se alerta deste tipo+paciente já existe e não foi lido → não duplica
// Se foi lido há mais de 7 dias e condição persiste → reativa
async function upsertAlerta({ tipo, prioridade, titulo, corpo, paciente_id, acao_tipo, acao_url, acao_whatsapp }) {
  const existing = await db.query(
    'SELECT * FROM alertas WHERE tipo=$1 AND paciente_id=$2 AND resolvido=false ORDER BY gerado_em DESC LIMIT 1',
    [tipo, paciente_id]
  );
  const e = existing.rows[0];

  if (e) {
    // Alerta já existe não lido — mantém, não duplica
    if (!e.lido && !e.lembrar_depois) return;

    // Lembrar depois ainda não expirou
    if (e.lembrar_depois && e.lembrar_em > new Date()) return;

    // Lido há menos de 7 dias — aguarda
    if (e.lido && e.lido_em) {
      var diasLido = (Date.now() - new Date(e.lido_em)) / (1000*60*60*24);
      if (diasLido < 7) return;
    }

    // Reativa: nova entrada (mantém histórico)
    await db.query(
      'UPDATE alertas SET resolvido=true WHERE id=$1', [e.id]
    );
  }

  // Cria novo alerta
  await db.query(
    `INSERT INTO alertas (tipo,prioridade,titulo,corpo,paciente_id,acao_tipo,acao_url,acao_whatsapp)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [tipo, prioridade, titulo, corpo||null, paciente_id||null,
     acao_tipo||null, acao_url||null, acao_whatsapp||null]
  );
}

// ── HELPER: resolver alerta quando condição passa ──
async function resolverAlerta(tipo, paciente_id) {
  await db.query(
    'UPDATE alertas SET resolvido=true WHERE tipo=$1 AND paciente_id=$2 AND resolvido=false',
    [tipo, paciente_id]
  );
}

function fmtTel(tel) {
  if (!tel) return '';
  var t = tel.replace(/\D/g,'');
  return t.startsWith('55') ? t : '55'+t;
}

// ─────────────────────────────────────────────
// ALERTA 3.1 — ANIVERSARIANTES DA SEMANA
// ─────────────────────────────────────────────
async function verificarAniversarios() {
  try {
    const r = await db.query(`
      SELECT id, nome_completo, data_nascimento, telefone
      FROM pacientes
      WHERE status = 'ativo'
        AND data_nascimento IS NOT NULL
        AND (
          TO_CHAR(data_nascimento, 'MM-DD') BETWEEN
            TO_CHAR(NOW(), 'MM-DD') AND
            TO_CHAR(NOW() + INTERVAL '7 days', 'MM-DD')
          OR (
            EXTRACT(MONTH FROM NOW()) = 12
            AND TO_CHAR(data_nascimento, 'MM-DD') <= '01-07'
          )
        )
    `);

    for (var pac of r.rows) {
      var nasc = new Date(pac.data_nascimento);
      var hoje = new Date();
      var anivEsteAno = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate());
      if (anivEsteAno < hoje) anivEsteAno.setFullYear(hoje.getFullYear()+1);
      var diasRestantes = Math.round((anivEsteAno - hoje) / (1000*60*60*24));
      var idadeNova = anivEsteAno.getFullYear() - nasc.getFullYear();

      var titulo = diasRestantes === 0
        ? '🎂 ' + pac.nome_completo.split(' ')[0] + ' faz aniversário hoje!'
        : '🎂 ' + pac.nome_completo.split(' ')[0] + ' faz aniversário em ' + diasRestantes + (diasRestantes===1?' dia':' dias');

      var corpo = pac.nome_completo + ' completa ' + idadeNova + ' anos em ' +
        anivEsteAno.toLocaleDateString('pt-BR') + '.';

      await upsertAlerta({
        tipo:        'aniversario',
        prioridade:  'informativo',
        titulo,
        corpo,
        paciente_id: pac.id,
        acao_tipo:   'paciente',
        acao_url:    '/sessoes/' + pac.id,
        acao_whatsapp: fmtTel(pac.telefone)
      });
    }
  } catch(e) { console.error('Cron aniversarios:', e.message); }
}

// ─────────────────────────────────────────────
// ALERTA 3.2 — SEM SESSÃO RECENTE
// ─────────────────────────────────────────────
async function verificarSemSessao() {
  try {
    const r = await db.query(`
      SELECT p.id, p.nome_completo, p.telefone,
             MAX(s.data_sessao) AS ultima_sessao,
             EXTRACT(DAY FROM NOW() - MAX(s.data_sessao)) AS dias
      FROM pacientes p
      LEFT JOIN sessoes s ON s.paciente_id = p.id AND s.status = 'realizada'
      WHERE p.status = 'ativo'
      GROUP BY p.id, p.nome_completo, p.telefone
      HAVING MAX(s.data_sessao) IS NOT NULL
    `);

    for (var pac of r.rows) {
      var dias = Math.round(parseFloat(pac.dias));
      var primeiroNome = pac.nome_completo.split(' ')[0];
      var wpp = fmtTel(pac.telefone);

      if (dias >= 21) {
        await upsertAlerta({
          tipo: 'sem_sessao_critico', prioridade: 'critico',
          titulo: '⚠️ ' + primeiroNome + ' está há ' + dias + ' dias sem sessão',
          corpo:  pac.nome_completo + ' não tem sessão registrada há ' + dias + ' dias. Risco de evasão.',
          paciente_id: pac.id, acao_tipo: 'paciente',
          acao_url: '/sessoes/'+pac.id, acao_whatsapp: wpp
        });
        // Resolve os de menor prioridade
        await resolverAlerta('sem_sessao_atencao', pac.id);
        await resolverAlerta('sem_sessao_operacional', pac.id);
      } else if (dias >= 15) {
        await upsertAlerta({
          tipo: 'sem_sessao_atencao', prioridade: 'atencao',
          titulo: '⚠️ ' + primeiroNome + ' está há ' + dias + ' dias sem sessão',
          corpo:  pac.nome_completo + ' não tem sessão registrada há ' + dias + ' dias.',
          paciente_id: pac.id, acao_tipo: 'paciente',
          acao_url: '/sessoes/'+pac.id, acao_whatsapp: wpp
        });
        await resolverAlerta('sem_sessao_operacional', pac.id);
      } else if (dias >= 10) {
        await upsertAlerta({
          tipo: 'sem_sessao_operacional', prioridade: 'operacional',
          titulo: '⚠️ ' + primeiroNome + ' está há ' + dias + ' dias sem sessão',
          corpo:  pac.nome_completo + ' não tem sessão registrada há ' + dias + ' dias.',
          paciente_id: pac.id, acao_tipo: 'paciente',
          acao_url: '/sessoes/'+pac.id, acao_whatsapp: wpp
        });
      } else {
        // Condição resolvida — paciente voltou a sessionar
        await resolverAlerta('sem_sessao_critico', pac.id);
        await resolverAlerta('sem_sessao_atencao', pac.id);
        await resolverAlerta('sem_sessao_operacional', pac.id);
      }
    }
  } catch(e) { console.error('Cron sem_sessao:', e.message); }
}

// ─────────────────────────────────────────────
// ALERTA 3.3 — SESSÕES SEM PAGAMENTO
// ─────────────────────────────────────────────
async function verificarPagamentos() {
  try {
    const r = await db.query(`
      SELECT p.id, p.nome_completo, p.telefone,
             COUNT(s.id) AS qtd_pendentes,
             COALESCE(SUM(s.valor_cobrado), 0) AS total_pendente,
             MIN(s.data_sessao) AS mais_antiga
      FROM pacientes p
      JOIN sessoes s ON s.paciente_id = p.id
        AND s.status = 'realizada'
        AND s.pago = false
        AND s.valor_cobrado > 0
      WHERE p.status = 'ativo'
      GROUP BY p.id, p.nome_completo, p.telefone
      HAVING COUNT(s.id) > 0
    `);

    // Get all active patients to resolve alerts for those with no pending
    const ativos = await db.query("SELECT id FROM pacientes WHERE status='ativo'");
    var comPendente = new Set(r.rows.map(function(row){ return row.id; }));

    for (var pac of ativos.rows) {
      if (!comPendente.has(pac.id)) {
        await resolverAlerta('pagamento_pendente', pac.id);
      }
    }

    for (var pac of r.rows) {
      var qtd  = parseInt(pac.qtd_pendentes);
      var val  = parseFloat(pac.total_pendente);
      var nome = pac.nome_completo.split(' ')[0];
      var valStr = 'R$ ' + val.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
      var diasAtraso = Math.round((Date.now() - new Date(pac.mais_antiga)) / (1000*60*60*24));

      await upsertAlerta({
        tipo: 'pagamento_pendente', prioridade: 'atencao',
        titulo: '💰 ' + nome + ' — ' + qtd + ' sessão' + (qtd>1?'ões':'') + ' pendente' + (qtd>1?'s':'') + ' · ' + valStr,
        corpo:  pac.nome_completo + ' possui ' + qtd + ' sessão' + (qtd>1?'ões':'') +
                ' não paga' + (qtd>1?'s':'') + ', totalizando ' + valStr +
                '. Atraso de ' + diasAtraso + ' dias.',
        paciente_id: pac.id, acao_tipo: 'financeiro',
        acao_url: '/financeiro',
        acao_whatsapp: fmtTel(pac.telefone)
      });
    }
  } catch(e) { console.error('Cron pagamentos:', e.message); }
}

// ─────────────────────────────────────────────
// ALERTA 3.6 — SEM FEEDBACK RECENTE
// ─────────────────────────────────────────────
async function verificarFeedbacks() {
  try {
    const r = await db.query(`
      SELECT p.id, p.nome_completo, p.telefone,
             MAX(f.data_feedback) AS ultimo_feedback,
             EXTRACT(DAY FROM NOW() - MAX(f.data_feedback)) AS dias,
             COUNT(s.id) AS total_sessoes
      FROM pacientes p
      LEFT JOIN feedbacks_paciente f ON f.paciente_id = p.id
      LEFT JOIN sessoes s ON s.paciente_id = p.id AND s.status = 'realizada'
      WHERE p.status = 'ativo'
      GROUP BY p.id, p.nome_completo, p.telefone
      HAVING MAX(f.data_feedback) IS NOT NULL
        AND COUNT(s.id) >= 2
    `);

    for (var pac of r.rows) {
      var dias = Math.round(parseFloat(pac.dias));
      var nome = pac.nome_completo.split(' ')[0];

      if (dias >= 30) {
        await upsertAlerta({
          tipo: 'sem_feedback_atencao', prioridade: 'atencao',
          titulo: '📝 ' + nome + ' sem feedback há ' + dias + ' dias',
          corpo:  pac.nome_completo + ' não envia feedback há ' + dias + ' dias.',
          paciente_id: pac.id, acao_tipo: 'paciente',
          acao_url: '/sessoes/'+pac.id,
          acao_whatsapp: fmtTel(pac.telefone)
        });
        await resolverAlerta('sem_feedback_operacional', pac.id);
      } else if (dias >= 20) {
        await upsertAlerta({
          tipo: 'sem_feedback_operacional', prioridade: 'operacional',
          titulo: '📝 ' + nome + ' sem feedback há ' + dias + ' dias',
          corpo:  pac.nome_completo + ' não envia feedback há ' + dias + ' dias.',
          paciente_id: pac.id, acao_tipo: 'paciente',
          acao_url: '/sessoes/'+pac.id,
          acao_whatsapp: fmtTel(pac.telefone)
        });
      } else {
        await resolverAlerta('sem_feedback_atencao', pac.id);
        await resolverAlerta('sem_feedback_operacional', pac.id);
      }
    }
  } catch(e) { console.error('Cron feedbacks:', e.message); }
}

// ─────────────────────────────────────────────
// ALERTA 3.9 — SEM RETORNO APÓS 1ª SESSÃO
// ─────────────────────────────────────────────
async function verificarSemRetorno() {
  try {
    const r = await db.query(`
      SELECT p.id, p.nome_completo, p.telefone,
             MIN(s.data_sessao) AS primeira_sessao,
             COUNT(s.id) AS total_sessoes,
             EXTRACT(DAY FROM NOW() - MIN(s.data_sessao)) AS dias_desde_primeira
      FROM pacientes p
      JOIN sessoes s ON s.paciente_id = p.id AND s.status = 'realizada'
      WHERE p.status = 'ativo'
      GROUP BY p.id, p.nome_completo, p.telefone
      HAVING COUNT(s.id) = 1
        AND EXTRACT(DAY FROM NOW() - MIN(s.data_sessao)) >= 10
    `);

    const temRetorno = await db.query(`
      SELECT DISTINCT paciente_id FROM sessoes
      WHERE status = 'realizada'
      GROUP BY paciente_id HAVING COUNT(*) > 1
    `);
    var comRetorno = new Set(temRetorno.rows.map(function(r){ return r.paciente_id; }));

    for (var pac of r.rows) {
      if (comRetorno.has(pac.id)) {
        await resolverAlerta('sem_retorno', pac.id);
        continue;
      }
      var dias = Math.round(parseFloat(pac.dias_desde_primeira));
      var nome = pac.nome_completo.split(' ')[0];

      await upsertAlerta({
        tipo: 'sem_retorno', prioridade: 'atencao',
        titulo: '🔄 ' + nome + ' realizou 1ª sessão mas não retornou',
        corpo:  pac.nome_completo + ' realizou a primeira sessão há ' + dias +
                ' dias e ainda não agendou retorno.',
        paciente_id: pac.id, acao_tipo: 'paciente',
        acao_url: '/sessoes/'+pac.id,
        acao_whatsapp: fmtTel(pac.telefone)
      });
    }
  } catch(e) { console.error('Cron sem_retorno:', e.message); }
}

// ─────────────────────────────────────────────
// ALERTA: LINKS DE MAPEAMENTO EXPIRANDO/EXPIRADOS
// ─────────────────────────────────────────────
async function verificarLinksMapeamento() {
  try {
    const r = await db.query(`
      SELECT ft.id, ft.paciente_id, ft.expira_em, ft.usado,
             p.nome_completo, p.telefone,
             EXTRACT(EPOCH FROM (ft.expira_em - NOW()))/3600 AS horas_restantes
      FROM form_tokens ft
      JOIN pacientes p ON p.id = ft.paciente_id
      WHERE ft.usado = false
        AND p.status = 'ativo'
      ORDER BY ft.expira_em ASC
    `);

    for (var row of r.rows) {
      var horas = parseFloat(row.horas_restantes);
      var nome  = row.nome_completo.split(' ')[0];
      var pid   = row.paciente_id;

      if (horas < 0) {
        // Link expirado
        await upsertAlerta({
          tipo: 'link_mapeamento_expirado', prioridade: 'atencao',
          titulo: '🔗 Link de mapeamento de ' + nome + ' expirou',
          corpo:  'O link do formulário de mapeamento de ' + row.nome_completo + ' expirou. Gere um novo link se necessário.',
          paciente_id: pid, acao_tipo: 'paciente',
          acao_url: '/pacientes',
          acao_whatsapp: fmtTel(row.telefone)
        });
        await resolverAlerta('link_mapeamento_expirando', pid);
      } else if (horas <= 24) {
        // Expira em até 1 dia
        var hStr = horas < 1 ? 'menos de 1 hora' : Math.round(horas) + ' hora' + (Math.round(horas)>1?'s':'');
        await upsertAlerta({
          tipo: 'link_mapeamento_expirando', prioridade: 'operacional',
          titulo: '🔗 Link de mapeamento de ' + nome + ' expira em ' + hStr,
          corpo:  'O formulário de mapeamento de ' + row.nome_completo + ' expira em ' + hStr + '. Acompanhe se o paciente preencheu.',
          paciente_id: pid, acao_tipo: 'paciente',
          acao_url: '/pacientes',
          acao_whatsapp: fmtTel(row.telefone)
        });
      } else {
        // Link ainda válido — resolve alertas anteriores
        await resolverAlerta('link_mapeamento_expirando', pid);
        await resolverAlerta('link_mapeamento_expirado', pid);
      }
    }
  } catch(e) { console.error('Cron links_mapeamento:', e.message); }
}

// ─────────────────────────────────────────────
// ALERTA: LINKS DE EVOLUÇÃO EXPIRANDO/EXPIRADOS
// ─────────────────────────────────────────────
async function verificarLinksEvolucao() {
  try {
    const r = await db.query(`
      SELECT rt.id, rt.paciente_id, rt.expira_em,
             p.nome_completo, p.telefone,
             EXTRACT(EPOCH FROM (rt.expira_em - NOW()))/3600 AS horas_restantes
      FROM relatorio_tokens rt
      JOIN pacientes p ON p.id = rt.paciente_id
      WHERE p.status = 'ativo'
        AND rt.expira_em > NOW() - INTERVAL '2 days'
      ORDER BY rt.expira_em ASC
    `);

    for (var row of r.rows) {
      var horas = parseFloat(row.horas_restantes);
      var nome  = row.nome_completo.split(' ')[0];
      var pid   = row.paciente_id;

      if (horas < 0) {
        await upsertAlerta({
          tipo: 'link_evolucao_expirado', prioridade: 'operacional',
          titulo: '📈 Link de evolução de ' + nome + ' expirou',
          corpo:  'O link do relatório de evolução de ' + row.nome_completo + ' expirou. Gere um novo se necessário.',
          paciente_id: pid, acao_tipo: 'paciente',
          acao_url: '/mapeamento/' + pid,
          acao_whatsapp: fmtTel(row.telefone)
        });
        await resolverAlerta('link_evolucao_expirando', pid);
      } else if (horas <= 24) {
        var hStr = horas < 1 ? 'menos de 1 hora' : Math.round(horas) + ' hora' + (Math.round(horas)>1?'s':'');
        await upsertAlerta({
          tipo: 'link_evolucao_expirando', prioridade: 'operacional',
          titulo: '📈 Link de evolução de ' + nome + ' expira em ' + hStr,
          corpo:  'O relatório de evolução de ' + row.nome_completo + ' expira em ' + hStr + '. Compartilhe antes do prazo.',
          paciente_id: pid, acao_tipo: 'paciente',
          acao_url: '/mapeamento/' + pid,
          acao_whatsapp: fmtTel(row.telefone)
        });
      } else {
        await resolverAlerta('link_evolucao_expirando', pid);
        await resolverAlerta('link_evolucao_expirado', pid);
      }
    }
  } catch(e) { console.error('Cron links_evolucao:', e.message); }
}

// ─────────────────────────────────────────────
// FUNÇÃO PRINCIPAL — executa todos os checks
// ─────────────────────────────────────────────
async function gerarAlertas() {
  console.log('🔔 Cron alertas iniciado — ' + new Date().toLocaleTimeString('pt-BR'));
  await verificarAniversarios();
  await verificarSemSessao();
  await verificarPagamentos();
  await verificarFeedbacks();
  await verificarSemRetorno();
  await verificarLinksMapeamento();
  await verificarLinksEvolucao();
  console.log('🔔 Cron alertas concluído');
}

module.exports = { gerarAlertas };
