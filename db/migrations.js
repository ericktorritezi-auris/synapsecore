const db = require('./index');
const bcrypt = require('bcryptjs');

async function runMigrations() {
  const client = await db.connect();
  try {
    console.log('🔄 Verificando banco de dados...');

    // ── TERAPEUTAS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS terapeutas (
        id               SERIAL PRIMARY KEY,
        nome             VARCHAR(255) NOT NULL,
        login            VARCHAR(100) UNIQUE NOT NULL,
        senha_hash       VARCHAR(255) NOT NULL,
        email            VARCHAR(255),
        telefone         VARCHAR(30),
        especialidades   TEXT,
        bio              TEXT,
        foto_url         TEXT,
        logo_url         TEXT,
        assinatura_url   TEXT,
        carimbo_url      TEXT,
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── REGISTROS PROFISSIONAIS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS registros_profissionais (
        id             SERIAL PRIMARY KEY,
        terapeuta_id   INTEGER REFERENCES terapeutas(id) ON DELETE CASCADE,
        instituicao    VARCHAR(255) NOT NULL,
        numero         VARCHAR(100) NOT NULL,
        created_at     TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── PACOTES / PROGRAMAS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS pacotes (
        id               SERIAL PRIMARY KEY,
        nome             VARCHAR(255) NOT NULL,
        descricao        TEXT,
        publico_alvo     VARCHAR(100),
        qtd_sessoes      INTEGER,
        valor_avista     DECIMAL(10,2),
        valor_parcelado  DECIMAL(10,2),
        parcelas         INTEGER,
        sessoes_json     JSONB,
        ativo            BOOLEAN DEFAULT true,
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── PACIENTES ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id                     SERIAL PRIMARY KEY,
        nome_completo          VARCHAR(255) NOT NULL,
        data_nascimento        DATE,
        genero                 VARCHAR(50),
        email                  VARCHAR(255),
        telefone               VARCHAR(30),
        cpf                    VARCHAR(20),
        rg                     VARCHAR(30),
        pais                   VARCHAR(100) DEFAULT 'Brasil',
        endereco_completo      TEXT,
        cidade                 VARCHAR(100),
        cep                    VARCHAR(20),
        foto_url               TEXT,
        perfil_tipo            VARCHAR(50),
        eh_neurodivergente     BOOLEAN DEFAULT false,
        diagnostico_neurodiv   TEXT,
        motivo_busca           TEXT,
        pacote_id              INTEGER REFERENCES pacotes(id),
        casal_id               INTEGER,
        responsavel_id         INTEGER REFERENCES pacientes(id),
        observacoes            TEXT,
        sessoes_anteriores     INTEGER DEFAULT 0,
        data_primeira_sessao   DATE,
        programa_sessao_atual  INTEGER DEFAULT 0,
        status                 VARCHAR(50) DEFAULT 'ativo',
        created_at             TIMESTAMP DEFAULT NOW(),
        updated_at             TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── CASAIS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS casais (
        id             SERIAL PRIMARY KEY,
        paciente_1_id  INTEGER REFERENCES pacientes(id),
        paciente_2_id  INTEGER REFERENCES pacientes(id),
        status         VARCHAR(50) DEFAULT 'aguardando_vinculo',
        created_at     TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── TOKENS DO FORMULÁRIO ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS form_tokens (
        id           SERIAL PRIMARY KEY,
        token        UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        paciente_id  INTEGER REFERENCES pacientes(id),
        usado        BOOLEAN DEFAULT false,
        expira_em    TIMESTAMP NOT NULL,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── RESPOSTAS DO FORMULÁRIO ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS respostas_formulario (
        id              SERIAL PRIMARY KEY,
        paciente_id     INTEGER REFERENCES pacientes(id),
        token_id        INTEGER REFERENCES form_tokens(id),
        respostas_json  JSONB NOT NULL,
        marcadores_json JSONB,
        risco_nivel     VARCHAR(20) DEFAULT 'verde',
        risco_flags     JSONB,
        concluido       BOOLEAN DEFAULT false,
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── LOGS LGPD ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS lgpd_logs (
        id             SERIAL PRIMARY KEY,
        paciente_id    INTEGER REFERENCES pacientes(id),
        paciente_nome  VARCHAR(255),
        paciente_cpf   VARCHAR(20),
        lgpd_aceito    BOOLEAN NOT NULL,
        lgpd_ia_aceito BOOLEAN DEFAULT false,
        ip_origem      VARCHAR(45),
        user_agent     TEXT,
        versao_termo   VARCHAR(20) DEFAULT '1.0',
        hash_documento VARCHAR(64),
        data_hora      TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── SESSÕES CLÍNICAS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessoes (
        id                SERIAL PRIMARY KEY,
        paciente_id       INTEGER REFERENCES pacientes(id),
        paciente_2_id     INTEGER REFERENCES pacientes(id),
        pacote_id         INTEGER REFERENCES pacotes(id),
        sessao_numero     INTEGER NOT NULL,
        data_sessao       DATE NOT NULL,
        duracao_minutos   INTEGER DEFAULT 50,
        valor_cobrado     DECIMAL(10,2),
        forma_pagamento   VARCHAR(50),
        resumo_terapeuta  TEXT,
        status            VARCHAR(50) DEFAULT 'realizada',
        created_at        TIMESTAMP DEFAULT NOW(),
        updated_at        TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── MAPEAMENTOS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS mapeamentos (
        id                      SERIAL PRIMARY KEY,
        paciente_id             INTEGER REFERENCES pacientes(id),
        versao                  INTEGER DEFAULT 1,
        resumo_ia               TEXT,
        dimensoes_json          JSONB,
        indices_json            JSONB,
        flags_json              JSONB,
        protocolo_json          JSONB,
        pacote_recomendado_id   INTEGER REFERENCES pacotes(id),
        compatibilidade_pct     INTEGER,
        risco_nivel             VARCHAR(20) DEFAULT 'verde',
        obs_terapeuta           TEXT,
        finalizado              BOOLEAN DEFAULT false,
        created_at              TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── RESUMOS CLÍNICOS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS resumos_clinicos (
        id                    SERIAL PRIMARY KEY,
        paciente_id           INTEGER REFERENCES pacientes(id),
        versao                INTEGER DEFAULT 1,
        conteudo_ia           TEXT,
        sessoes_consideradas  JSONB,
        gerado_em             TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── ALTER TABLE: guardian fields (safe, idempotent) ──
    await client.query(`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS responsavel_nome VARCHAR(255)`);
    await client.query(`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS responsavel_cpf VARCHAR(20)`);
    await client.query(`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS responsavel_email VARCHAR(255)`);
    await client.query(`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS responsavel_telefone VARCHAR(30)`);
    await client.query(`ALTER TABLE mapeamentos ADD COLUMN IF NOT EXISTS programa_modo VARCHAR(20) DEFAULT 'fallback'`);
    await client.query(`ALTER TABLE mapeamentos ADD COLUMN IF NOT EXISTS contexto_token UUID DEFAULT gen_random_uuid()`);
    await client.query(`ALTER TABLE mapeamentos ADD COLUMN IF NOT EXISTS contexto_inicial TEXT`);
    await client.query(`ALTER TABLE sessoes ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT false`);

    // ══════════════════════════════════════════════
    // v3.0.0 — INTELIGÊNCIA CLÍNICA INTEGRATIVA
    // ══════════════════════════════════════════════

    // ── IA AUDITORIA ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS ia_auditoria (
        id               SERIAL PRIMARY KEY,
        paciente_id      INTEGER REFERENCES pacientes(id) ON DELETE SET NULL,
        modulo           VARCHAR(60)  NOT NULL,
        referencia_tipo  VARCHAR(40),
        referencia_id    INTEGER,
        prompt_resumo    TEXT,
        input_hash       VARCHAR(64),
        output_resumo    TEXT,
        tokens_usados    INTEGER,
        duracao_ms       INTEGER,
        sucesso          BOOLEAN DEFAULT true,
        erro_msg         TEXT,
        modelo           VARCHAR(60),
        modo             VARCHAR(20) DEFAULT 'ia',
        created_at       TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── BRIEFINGS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS briefings (
        id               SERIAL PRIMARY KEY,
        paciente_id      INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        conteudo_json    JSONB NOT NULL,
        conteudo_texto   TEXT,
        sessoes_base     JSONB DEFAULT '[]',
        feedbacks_base   JSONB DEFAULT '[]',
        resumo_versao    INTEGER,
        hash_contexto    VARCHAR(64),
        modo             VARCHAR(20) DEFAULT 'ia',
        erro_msg         TEXT,
        gerado_em        TIMESTAMP DEFAULT NOW(),
        atualizado_em    TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── INTERVENÇÕES ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS intervencoes (
        id               SERIAL PRIMARY KEY,
        paciente_id      INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        mapeamento_id    INTEGER REFERENCES mapeamentos(id) ON DELETE SET NULL,
        sessao_id        INTEGER REFERENCES sessoes(id) ON DELETE SET NULL,
        tipo             VARCHAR(40),
        categoria_clinica VARCHAR(60),
        publico_alvo     VARCHAR(40),
        titulo           VARCHAR(255) NOT NULL,
        descricao        TEXT,
        fundamentacao    TEXT,
        status           VARCHAR(20) DEFAULT 'sugerida',
        favorita         BOOLEAN DEFAULT false,
        avaliacao        VARCHAR(20),
        observacao       TEXT,
        gerado_em        TIMESTAMP DEFAULT NOW(),
        atualizado_em    TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── MEMÓRIA TERAPÊUTICA ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS memoria_terapeutica (
        id                SERIAL PRIMARY KEY,
        paciente_id       INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        versao            INTEGER NOT NULL DEFAULT 1,
        ativa             BOOLEAN DEFAULT true,
        conteudo_json     JSONB NOT NULL,
        conteudo_texto    TEXT,
        sessoes_base      JSONB DEFAULT '[]',
        feedbacks_base    JSONB DEFAULT '[]',
        intervencoes_base JSONB DEFAULT '[]',
        hash_contexto     VARCHAR(64),
        gerado_em         TIMESTAMP DEFAULT NOW()
      )
    `);

    // ══════════════════════════════════════════════
    // v3.1.0 — ANÁLISE ESTRUTURAL CLÍNICA
    // ══════════════════════════════════════════════

    await client.query(`
      CREATE TABLE IF NOT EXISTS analise_estrutural (
        id               SERIAL PRIMARY KEY,
        paciente_id      INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        mapeamento_id    INTEGER REFERENCES mapeamentos(id) ON DELETE SET NULL,
        versao           INTEGER NOT NULL DEFAULT 1,
        ativa            BOOLEAN DEFAULT true,
        resumo_executivo TEXT,
        conteudo_json    JSONB NOT NULL DEFAULT '{}',
        hash_contexto    VARCHAR(64),
        modelo_ia        VARCHAR(60),
        modo             VARCHAR(20) DEFAULT 'ia',
        erro_msg         TEXT,
        gerado_em        TIMESTAMP DEFAULT NOW(),
        atualizado_em    TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS hipoteses_clinicas (
        id                       SERIAL PRIMARY KEY,
        paciente_id              INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        mapeamento_id            INTEGER REFERENCES mapeamentos(id) ON DELETE SET NULL,
        versao_geracao           INTEGER DEFAULT 1,
        tipo                     VARCHAR(60),
        nivel_confianca          NUMERIC(4,1),
        origem                   VARCHAR(20) DEFAULT 'ia',
        ativa                    BOOLEAN DEFAULT true,
        hipotese_ia              TEXT NOT NULL,
        evidencias_favoraveis    JSONB DEFAULT '[]',
        evidencias_contrarias    JSONB DEFAULT '[]',
        perguntas_validacao      JSONB DEFAULT '[]',
        interpretacao_terapeuta  TEXT,
        ajuste_clinico           TEXT,
        status                   VARCHAR(30) DEFAULT 'ativa',
        criado_em                TIMESTAMP DEFAULT NOW(),
        atualizado_em            TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS mapa_identidade (
        id                    SERIAL PRIMARY KEY,
        paciente_id           INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        mapeamento_id         INTEGER REFERENCES mapeamentos(id) ON DELETE SET NULL,
        versao                INTEGER NOT NULL DEFAULT 1,
        ativa                 BOOLEAN DEFAULT true,
        conteudo_json         JSONB NOT NULL DEFAULT '{}',
        frase_identitaria     TEXT,
        praticas_sustentacao  JSONB DEFAULT '[]',
        hash_contexto         VARCHAR(64),
        modelo_ia             VARCHAR(60),
        modo                  VARCHAR(20) DEFAULT 'ia',
        erro_msg              TEXT,
        gerado_em             TIMESTAMP DEFAULT NOW(),
        atualizado_em         TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedbacks_paciente (
        id            SERIAL PRIMARY KEY,
        paciente_id   INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        data_feedback DATE NOT NULL DEFAULT CURRENT_DATE,
        conteudo      TEXT NOT NULL,
        created_at    TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── RESUMO CLÍNICO — campos de controle incremental ──
    await client.query(`ALTER TABLE resumos_clinicos ADD COLUMN IF NOT EXISTS feedbacks_considerados JSONB DEFAULT '[]'`);
    await client.query(`ALTER TABLE resumos_clinicos ADD COLUMN IF NOT EXISTS obs_hash VARCHAR(64)`);

    console.log('✅ Tabelas verificadas/criadas');

    // ── SEED: TERAPEUTA ──
    const terapeutaExiste = await client.query(
      `SELECT id FROM terapeutas WHERE login = $1`, ['admin']
    );

    if (terapeutaExiste.rows.length === 0) {
      const senhaHash = bcrypt.hashSync('Et96694884', 12);
      await client.query(`
        INSERT INTO terapeutas (nome, login, senha_hash, email, especialidades)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'Erick Torritezi',
        'admin',
        senhaHash,
        'erick@evolutiontherapy.com.br',
        'Psicanalista · Psicoterapeuta Integrativo · Master Hipnoterapeuta'
      ]);

      await client.query(`
        INSERT INTO registros_profissionais (terapeuta_id, instituicao, numero)
        VALUES
          ((SELECT id FROM terapeutas WHERE login = 'admin'), 'ABRAPH', ''),
          ((SELECT id FROM terapeutas WHERE login = 'admin'), 'ATH', '')
      `);

      console.log('✅ Terapeuta admin criado');
    } else {
      console.log('✅ Terapeuta admin já existe');
    }

    // ── SEED: PACOTES EVOLUTION THERAPY ──
    const pacotesExistem = await client.query(`SELECT id FROM pacotes LIMIT 1`);

    if (pacotesExistem.rows.length === 0) {
      const pacotes = [
        {
          nome: 'Destravamento & Decisão',
          descricao: 'Para pessoas com consciência sobre seus conflitos, mas com dificuldade em agir, decidir, sustentar mudanças ou sair de padrões repetitivos.',
          publico_alvo: 'adulto',
          qtd_sessoes: 8,
          valor_avista: 1120.00,
          valor_parcelado: 270.00,
          parcelas: 5,
          sessoes_json: JSON.stringify([
            { numero: 1, titulo: 'Anamnese Estratégica', descricao: 'História emocional, contexto atual, identificação do travamento principal e objetivos terapêuticos.' },
            { numero: 2, titulo: 'Mapa do Conflito', descricao: 'Clareza dos padrões emocionais, ambivalências, estrutura do sofrimento e funcionamento emocional.' },
            { numero: 3, titulo: 'Tensão Terapêutica', descricao: 'Confronto estratégico leve, consciência do custo emocional e exposição dos mecanismos de manutenção.' },
            { numero: 4, titulo: 'Decisão', descricao: 'Clareza de escolha, primeira ruptura de padrão e posicionamento interno.' },
            { numero: 5, titulo: 'Identidade', descricao: 'Construção de nova identidade emocional, quem o paciente precisa se tornar e responsabilidade emocional.' },
            { numero: 6, titulo: 'Sustentação', descricao: 'Recaídas, estratégias de manutenção e regulação emocional.' },
            { numero: 7, titulo: 'Consolidação', descricao: 'Reforço de novos padrões e integração emocional.' },
            { numero: 8, titulo: 'Fechamento', descricao: 'Revisão do processo, autonomia e continuidade opcional.' }
          ])
        },
        {
          nome: 'Reposicionamento de Casal',
          descricao: 'Para casais com conflitos recorrentes, distanciamento emocional ou dificuldades de comunicação.',
          publico_alvo: 'casal',
          qtd_sessoes: 10,
          valor_avista: 1900.00,
          valor_parcelado: 450.00,
          parcelas: 5,
          sessoes_json: JSON.stringify([
            { numero: 1, titulo: 'Escuta Inicial', descricao: 'Levantamento de queixas, dinâmica do relacionamento e história do casal.' },
            { numero: 2, titulo: 'Mapa Relacional', descricao: 'Identificação de padrões, ciclos de conflito e estrutura emocional do casal.' },
            { numero: 3, titulo: 'Responsabilidade Individual', descricao: 'Papel emocional de cada parceiro e consciência emocional.' },
            { numero: 4, titulo: 'Tensão', descricao: 'O que cada um evita e confronto estratégico do padrão.' },
            { numero: 5, titulo: 'Posicionamento', descricao: 'Clareza emocional e escolha consciente.' },
            { numero: 6, titulo: 'Comunicação Estruturada', descricao: 'Escuta ativa, comunicação assertiva e expressão emocional.' },
            { numero: 7, titulo: 'Reconexão', descricao: 'Reaproximação emocional e resgate de vínculo.' },
            { numero: 8, titulo: 'Ajuste de Conflito', descricao: 'Resolução prática e organização relacional.' },
            { numero: 9, titulo: 'Consolidação', descricao: 'Estabilização emocional e sustentação das mudanças.' },
            { numero: 10, titulo: 'Direção Futura', descricao: 'Planejamento do casal, continuidade ou encerramento.' }
          ])
        },
        {
          nome: 'Direção & Desenvolvimento',
          descricao: 'Para adolescentes com dificuldades emocionais, comportamentais, sociais ou de direção pessoal.',
          publico_alvo: 'adolescente',
          qtd_sessoes: 6,
          valor_avista: 750.00,
          valor_parcelado: 180.00,
          parcelas: 5,
          sessoes_json: JSON.stringify([
            { numero: 1, titulo: 'Acolhimento e Mapeamento', descricao: 'Contexto familiar, escola, comportamento e queixas principais.' },
            { numero: 2, titulo: 'Padrão Emocional', descricao: 'Emoções predominantes, reações automáticas e funcionamento emocional.' },
            { numero: 3, titulo: 'Conflito Interno', descricao: 'Desejo versus evitação e consciência emocional.' },
            { numero: 4, titulo: 'Direção e Escolha', descricao: 'Tomada de decisão e consequência das atitudes.' },
            { numero: 5, titulo: 'Comportamento', descricao: 'Ajustes práticos e redução de impulsividade.' },
            { numero: 6, titulo: 'Consolidação', descricao: 'Revisão do processo e direcionamento futuro.' }
          ])
        },
        {
          nome: 'Performance & Controle Mental',
          descricao: 'Para atletas com ansiedade competitiva, instabilidade emocional ou travamentos mentais.',
          publico_alvo: 'atleta',
          qtd_sessoes: 8,
          valor_avista: 1500.00,
          valor_parcelado: 360.00,
          parcelas: 5,
          sessoes_json: JSON.stringify([
            { numero: 1, titulo: 'Mapeamento de Performance', descricao: 'Histórico esportivo, situações de travamento e performance atual.' },
            { numero: 2, titulo: 'Padrão Emocional', descricao: 'Ansiedade competitiva, gatilhos emocionais e autocrítica.' },
            { numero: 3, titulo: 'Reação ao Erro', descricao: 'Queda de performance e reestruturação emocional.' },
            { numero: 4, titulo: 'Reprogramação Cognitiva', descricao: 'Narrativa interna, clareza mental e redução de insegurança.' },
            { numero: 5, titulo: 'Âncoras Mentais', descricao: 'Respiração, palavra-chave e estado emocional.' },
            { numero: 6, titulo: 'Execução e Flow', descricao: 'Foco na ação, estado de presença e performance sob pressão.' },
            { numero: 7, titulo: 'Simulação Mental', descricao: 'Visualização, preparação emocional e cenários competitivos.' },
            { numero: 8, titulo: 'Consolidação', descricao: 'Plano de manutenção e autonomia emocional.' }
          ])
        },
        {
          nome: 'Desenvolvimento & Regulação',
          descricao: 'Para adolescentes e adultos neurodivergentes (TEA/TDAH) com dificuldades de regulação emocional.',
          publico_alvo: 'neurodivergente',
          qtd_sessoes: 10,
          valor_avista: 1350.00,
          valor_parcelado: 320.00,
          parcelas: 5,
          sessoes_json: JSON.stringify([
            { numero: 1, titulo: 'Mapeamento Neuroemocional', descricao: 'Histórico, funcionamento geral, sensibilidades e rotina.' },
            { numero: 2, titulo: 'Sobrecargas', descricao: 'Gatilhos emocionais, exaustão social e crises emocionais.' },
            { numero: 3, titulo: 'Regulação Emocional', descricao: 'Nomeação emocional e estratégias de estabilização.' },
            { numero: 4, titulo: 'Organização Interna', descricao: 'Rotina, estruturação mental e previsibilidade.' },
            { numero: 5, titulo: 'Comunicação e Relações', descricao: 'Limites, relações sociais e expressão emocional.' },
            { numero: 6, titulo: 'Rigidez e Adaptação', descricao: 'Flexibilidade gradual e segurança emocional.' },
            { numero: 7, titulo: 'Ansiedade e Antecipação', descricao: 'Pensamentos recorrentes e controle de sobrecarga.' },
            { numero: 8, titulo: 'Autonomia Funcional', descricao: 'Estratégias práticas e desenvolvimento funcional.' },
            { numero: 9, titulo: 'Consolidação', descricao: 'Repetição de ferramentas e ajustes terapêuticos.' },
            { numero: 10, titulo: 'Planejamento Contínuo', descricao: 'Continuidade, manutenção e frequência ideal.' }
          ])
        },
        {
          nome: 'Acompanhamento Neurodivergente Contínuo',
          descricao: 'Acompanhamento contínuo para pacientes que concluíram o programa Desenvolvimento & Regulação.',
          publico_alvo: 'neurodivergente',
          qtd_sessoes: null,
          valor_avista: 150.00,
          valor_parcelado: null,
          parcelas: null,
          sessoes_json: JSON.stringify([])
        },
        {
          nome: 'Sessão Estratégica Individual',
          descricao: 'Sessão única para questão pontual ou início de processo terapêutico sem compromisso imediato.',
          publico_alvo: 'adulto',
          qtd_sessoes: 1,
          valor_avista: 170.00,
          valor_parcelado: null,
          parcelas: null,
          sessoes_json: JSON.stringify([
            { numero: 1, titulo: 'Sessão Estratégica', descricao: 'Clareza inicial, identificação do travamento principal e direcionamento estratégico.' }
          ])
        }
      ];

      for (const p of pacotes) {
        await client.query(`
          INSERT INTO pacotes (nome, descricao, publico_alvo, qtd_sessoes, valor_avista, valor_parcelado, parcelas, sessoes_json)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [p.nome, p.descricao, p.publico_alvo, p.qtd_sessoes, p.valor_avista, p.valor_parcelado, p.parcelas, p.sessoes_json]);
      }

      console.log('✅ Pacotes Evolution Therapy criados');
    } else {
      console.log('✅ Pacotes já existem');
    }

    // ── RELATORIO TOKENS (evolução do paciente — link público) ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS relatorio_tokens (
        id             SERIAL PRIMARY KEY,
        token          UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        paciente_id    INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        mapeamento_id  INTEGER REFERENCES mapeamentos(id),
        conteudo_json  JSONB NOT NULL,
        resumo_at      TIMESTAMP,
        expira_em      TIMESTAMP NOT NULL,
        criado_em      TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add resumo_at if upgrading from older version
    await client.query(`
      ALTER TABLE relatorio_tokens ADD COLUMN IF NOT EXISTS resumo_at TIMESTAMP
    `);

    // ── CIDS DO PACIENTE ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS cids_paciente (
        id                 SERIAL PRIMARY KEY,
        paciente_id        INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        mapeamento_id      INTEGER REFERENCES mapeamentos(id),
        cid_codigo         VARCHAR(10)  NOT NULL,
        cid_nome           VARCHAR(255) NOT NULL,
        relato_paciente    TEXT,
        significado_medico TEXT,
        confirmado         BOOLEAN DEFAULT false,
        gerado_por_ia      BOOLEAN DEFAULT true,
        created_at         TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── DOCUMENTOS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS documentos (
        id              SERIAL PRIMARY KEY,
        paciente_id     INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        sessao_id       INTEGER REFERENCES sessoes(id) ON DELETE SET NULL,
        tipo            VARCHAR(50) NOT NULL,
        titulo          VARCHAR(255),
        conteudo_json   JSONB NOT NULL,
        token           UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        periodo_inicio  DATE,
        periodo_fim     DATE,
        created_at      TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── PUSH SUBSCRIPTIONS ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id            SERIAL PRIMARY KEY,
        terapeuta_id  INTEGER REFERENCES terapeutas(id) ON DELETE CASCADE,
        endpoint      TEXT NOT NULL,
        p256dh        TEXT NOT NULL,
        auth          TEXT NOT NULL,
        user_agent    TEXT,
        created_at    TIMESTAMP DEFAULT NOW(),
        UNIQUE(terapeuta_id, endpoint)
      )
    `);

    // ── EVOLUÇÃO HISTÓRICO (persistente, independente do token 7 dias) ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS evolucao_historico (
        id            SERIAL PRIMARY KEY,
        paciente_id   INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        mapeamento_id INTEGER REFERENCES mapeamentos(id),
        indices_json  JSONB NOT NULL,
        score_global  NUMERIC(5,1),
        sessoes_count INTEGER,
        gerado_em     TIMESTAMP DEFAULT NOW()
      )
    `);

    // ══════════════════════════════════════════════
    // v3.2.0 — EVOLUÇÃO LONGITUDINAL E PREDIÇÃO
    // ══════════════════════════════════════════════

    await client.query(`
      CREATE TABLE IF NOT EXISTS linha_evolutiva (
        id                          SERIAL PRIMARY KEY,
        paciente_id                 INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        versao                      INTEGER NOT NULL DEFAULT 1,
        tipo_origem                 VARCHAR(40) NOT NULL,
        origem_id                   INTEGER,
        hash_contexto               VARCHAR(64),
        nivel_confianca             VARCHAR(30) DEFAULT 'quantitativo',
        eventos_considerados_json   JSONB DEFAULT '[]',
        scores_estruturais_json     JSONB DEFAULT '{}',
        scores_interpretativos_json JSONB DEFAULT '{}',
        tendencia                   VARCHAR(40),
        observacao_ia               TEXT,
        modelo_ia                   VARCHAR(60),
        gerado_em                   TIMESTAMP DEFAULT NOW(),
        atualizado_em               TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS risco_abandono (
        id                       SERIAL PRIMARY KEY,
        paciente_id              INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        versao                   INTEGER NOT NULL DEFAULT 1,
        hash_contexto            VARCHAR(64),
        score_basico             NUMERIC(5,1) DEFAULT 0,
        score_clinico            NUMERIC(5,1),
        nivel                    VARCHAR(20) DEFAULT 'baixo',
        nivel_confianca          VARCHAR(20) DEFAULT 'basico',
        status                   VARCHAR(30) DEFAULT 'ativo',
        resolvido                BOOLEAN DEFAULT false,
        fatores_json             JSONB DEFAULT '[]',
        explicacao               TEXT,
        sugestao_estrategica     TEXT,
        acao_recomendada         TEXT,
        observacao_terapeuta     TEXT,
        ultima_analise_leve      TIMESTAMP DEFAULT NOW(),
        ultima_analise_completa  TIMESTAMP,
        gerado_em                TIMESTAMP DEFAULT NOW(),
        modelo_ia                VARCHAR(60)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS evolucao_preditiva (
        id                       SERIAL PRIMARY KEY,
        paciente_id              INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        versao                   INTEGER NOT NULL DEFAULT 1,
        hash_contexto            VARCHAR(64),
        nivel_dados              VARCHAR(30) DEFAULT 'insuficiente',
        nivel_confianca          VARCHAR(20) DEFAULT 'baixa',
        horizonte_sessoes        INTEGER DEFAULT 6,
        tendencia_predominante   TEXT,
        fatores_favoraveis       JSONB DEFAULT '[]',
        fatores_risco            JSONB DEFAULT '[]',
        dimensoes_frageis        JSONB DEFAULT '[]',
        dimensoes_fortalecidas   JSONB DEFAULT '[]',
        proximos_focos           JSONB DEFAULT '[]',
        ajustes_recomendados     JSONB DEFAULT '[]',
        status                   VARCHAR(30) DEFAULT 'ativa',
        observacao_terapeuta     TEXT,
        comparacao_futura_json   JSONB DEFAULT '{}',
        gerado_em                TIMESTAMP DEFAULT NOW(),
        modelo_ia                VARCHAR(60)
      )
    `);

    // ══════════════════════════════════════════════
    // v3.3.0 — CENTRAL DE ALERTAS
    // ══════════════════════════════════════════════
    await client.query(`
      CREATE TABLE IF NOT EXISTS alertas (
        id             SERIAL PRIMARY KEY,
        tipo           VARCHAR(40) NOT NULL,
        prioridade     VARCHAR(20) NOT NULL DEFAULT 'operacional',
        titulo         TEXT NOT NULL,
        corpo          TEXT,
        paciente_id    INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        lido           BOOLEAN DEFAULT false,
        lido_em        TIMESTAMP,
        lembrar_depois BOOLEAN DEFAULT false,
        lembrar_em     TIMESTAMP,
        resolvido      BOOLEAN DEFAULT false,
        gerado_em      TIMESTAMP DEFAULT NOW(),
        acao_tipo      VARCHAR(30),
        acao_url       TEXT,
        acao_whatsapp  TEXT
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alertas_lido ON alertas(lido, resolvido)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alertas_paciente ON alertas(paciente_id)`);

    // ══════════════════════════════════════════════
    // v3.3.0 — CENTRAL INTELIGENTE DE ALERTAS
    // ══════════════════════════════════════════════

    await client.query(`
      CREATE TABLE IF NOT EXISTS alertas (
        id               SERIAL PRIMARY KEY,
        tipo             VARCHAR(40) NOT NULL,
        prioridade       VARCHAR(20) NOT NULL DEFAULT 'informativo',
        titulo           TEXT NOT NULL,
        corpo            TEXT,
        paciente_id      INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        lido             BOOLEAN DEFAULT false,
        lido_em          TIMESTAMP,
        lembrar_depois   BOOLEAN DEFAULT false,
        lembrar_em       TIMESTAMP,
        resolvido        BOOLEAN DEFAULT false,
        gerado_em        TIMESTAMP DEFAULT NOW(),
        acao_tipo        VARCHAR(30),
        acao_url         TEXT,
        acao_whatsapp    TEXT
      )
    `);

    // ══════════════════════════════════════════════
    // v3.3.0 — CENTRAL INTELIGENTE DE ALERTAS
    // ══════════════════════════════════════════════

    await client.query(`
      CREATE TABLE IF NOT EXISTS alertas (
        id               SERIAL PRIMARY KEY,
        tipo             VARCHAR(40) NOT NULL,
        prioridade       VARCHAR(20) NOT NULL DEFAULT 'informativo',
        titulo           TEXT NOT NULL,
        corpo            TEXT,
        paciente_id      INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
        lido             BOOLEAN DEFAULT false,
        lido_em          TIMESTAMP,
        lembrar_depois   BOOLEAN DEFAULT false,
        lembrar_em       TIMESTAMP,
        resolvido        BOOLEAN DEFAULT false,
        gerado_em        TIMESTAMP DEFAULT NOW(),
        acao_tipo        VARCHAR(30),
        acao_url         TEXT,
        acao_whatsapp    TEXT
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_alertas_ativo
      ON alertas(lido, resolvido, paciente_id)
    `);

    console.log('✅ Banco de dados pronto');
  } catch (err) {
    console.error('❌ Erro nas migrations:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
