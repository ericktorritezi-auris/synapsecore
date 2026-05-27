# SYNAPSE CORE
### Plataforma de Inteligência Clínica Integrativa

> Onde dados emocionais se tornam direção clínica.

**Versão:** 3.9.5
**Stack:** Node.js + Express + PostgreSQL
**Deploy:** Railway
**Domínio:** https://www.synapsecore.app.br

---

Desenvolvido para Evolution Therapy — Erick Torritezi.

---

## FUNCIONALIDADES PRINCIPAIS

### Gestão Clínica
- **Pacientes** — cadastro, perfil multidimensional, status (ativo/pendente/inativo)
- **Mapeamento Clínico** — análise multidimensional com IA, índices D1–D8, flags clínicas
- **Sessões** — registro, acompanhamento financeiro, WhatsApp pós-sessão
- **Prontuário Inteligente** — gerado por IA com histórico longitudinal
- **Documentos** — Laudo, Declaração, Alta, Encaminhamento Psiquiátrico

### Inteligência Clínica (IA)
- **Análise Estrutural** — mapa de identidade e hipóteses clínicas
- **Evolução Preditiva** — projeção longitudinal do caso
- **Risco de Abandono** — score preditivo de continuidade
- **Contexto Inicial** — documento humanizado para o paciente
- **Resumo Clínico** — atualizado automaticamente após sessões

### Timeline Evolutiva
A Timeline mostra a **jornada completa do paciente** desde o início do acompanhamento.

**Onde acessar:** Página do paciente → aba 🕐 Timeline

**O que mostra:**
- Score clínico global com variação desde o início
- Gráfico de evolução ao longo das sessões
- Feed vertical de eventos clínicos (sessões, mapeamentos, CIDs, documentos)
- Fases terapêuticas identificadas por IA (ex: "Fase de Acolhimento", "Reestruturação Cognitiva")
- Marcos importantes (5ª sessão, 10ª sessão, quedas/subidas de score)

**Comportamento ao abrir:**
- Se houver mudanças desde a última análise → IA gera novas fases automaticamente
- Se não houver mudanças → exibe "✓ Timeline atualizada" sem chamar a IA
- Todo processamento de IA é registrado no Consumo de API

### Radar Clínico
Painel de inteligência coletiva — visão geral de todos os pacientes.

**Alertas automáticos gerados (sino):**
| Alerta | Gatilho | Prioridade |
|---|---|---|
| 📉 Queda de score | Score caiu ≥15 pts entre evoluções | Crítico |
| 🔴 Score crítico | Score abaixo de 40 pts | Crítico |
| ⚠️ Flag crítica | Risco Suicida, Ideação Suicida ou Avaliação Psiquiátrica no mapeamento | Crítico |

### Integração Belle Planner (Agenda)
- Novo agendamento → alerta no sino
- 30min antes da sessão → alerta no sino
- Agenda do dia às 6h30 → resumo no sino

### Consumo de API
Painel em Sistema → Consumo API mostrando:
- Saldo disponível (informado manualmente)
- Consumo por dia, mês, média diária
- Ranking por funcionalidade
- Projeção de 30 dias

---

## ALERTAS AUTOMÁTICOS (SINO) — TIPOS

| Tipo | Descrição |
|---|---|
| `aniversario` | Aniversário do paciente |
| `sem_sessao_critico` | Paciente sem sessão há muito tempo |
| `pagamento_pendente` | Sessão com pagamento em aberto |
| `sem_feedback_atencao` | Paciente sem feedback recente |
| `sem_retorno` | Paciente não retornou após abandono |
| `agendamento_novo` | Novo agendamento na agenda |
| `sessao_em_breve` | Sessão em 30 minutos |
| `agenda_dia` | Resumo da agenda do dia (6h30) |
| `radar_queda_score` | Queda significativa no score clínico |
| `radar_score_critico` | Score clínico abaixo de 40 |
| `radar_flag_critica_*` | Flag crítica identificada no mapeamento |

---

## CONFIGURAÇÃO

### Variáveis de Ambiente (Railway)
```
DATABASE_URL           — PostgreSQL connection string
ANTHROPIC_API_KEY      — Chave da API Anthropic
WEBHOOK_AGENDA_SECRET  — Secret do webhook Belle Planner
WEBHOOK_TENANT_NAME    — Nome do tenant (ex: Terapia Evolutiva)
VAPID_PUBLIC_KEY       — Push notifications (público)
VAPID_PRIVATE_KEY      — Push notifications (privado)
VAPID_EMAIL            — Push notifications (email)
```

---

© 2026 Synapse Core — Erick Torritezi
