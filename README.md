# Alotth.com

## Arquitetura

### Tecnologias Principais

- Next.js (Latest)
- Supabase (Banco de dados e autenticação)
- Markdown para conteúdo
- Sistema de temas para visualização

### Estrutura do Projeto

```
alotth.com/
├── app/                    # Diretório principal do Next.js
│   ├── page.tsx           # Página inicial (em construção)
│   ├── admin/             # Área administrativa (protegida)
│   │   ├── layout.tsx    # Layout com verificação de autenticação
│   │   ├── page.tsx      # Dashboard principal
│   │   ├── login/        # Página de login administrativo
│   │   │   └── page.tsx  # Formulário de login
│   │   └── proposals/    # Gerenciamento de propostas
│   └── proposals/         # Visualização pública de propostas
├── components/            # Componentes reutilizáveis
│   ├── MarkdownRenderer.tsx # Renderizador de markdown com temas
│   └── auth/             # Componentes de autenticação
│       ├── LoginForm.tsx # Formulário de login
│       └── AuthGuard.tsx # Componente de proteção de rotas
├── lib/                   # Utilitários e configurações
│   ├── supabase/         # Configuração do Supabase
│   │   ├── config.ts     # Configuração do cliente
│   │   └── auth.ts       # Funções de autenticação
│   └── themes/           # Configurações de temas (definidas no código)
└── types/                # Definições de tipos TypeScript
```

### Funcionalidades Principais

1. **Autenticação**

   - Login via email/senha
   - Contas inicialmente desativadas
   - Ativação manual via Supabase
   - Proteção de rotas administrativas
   - Redirecionamento automático para login

2. **CMS de Propostas**

   - Criação e edição de propostas em Markdown
   - Armazenamento no Supabase
   - Sistema de compartilhamento via links únicos
   - Visualização pública das propostas

3. **Sistema de Temas**
   - Temas predefinidos no código:
     - Padrão (Default)
     - Gamer
     - Negócios
     - Divertido
   - Cada tema define estilos para:
     - Containers
     - Títulos
     - Parágrafos
     - Listas
     - Links
     - Códigos
     - Citações
     - Tabelas

### Modelo de Dados (Supabase)

```sql
-- Tabela de Propostas
proposals
  - id: uuid
  - title: string
  - content: text (markdown)
  - theme_id: string (referência ao ID do tema definido no código)
  - created_at: timestamp
  - updated_at: timestamp
  - share_key: string
  - is_active: boolean
```

## Configuração do Ambiente

1. Instalar dependências:

```bash
npm install
```

2. Configurar variáveis de ambiente:

```bash
cp .env.example .env.local
```

3. Configurar Supabase:

- Criar projeto no Supabase
- Adicionar credenciais no .env.local
- Executar migrations iniciais

4. Iniciar desenvolvimento:

```bash
npm run dev
```

## Próximos Passos

1. Implementar autenticação básica
2. Criar estrutura do CMS
3. Implementar visualização de propostas
4. Adicionar sistema de compartilhamento
