# 🔄 Conversor Google Keep → Mindmap

Este script converte suas notas do Google Keep para o formato JSON aceito pelo sistema de mindmap da aplicação, **incluindo processamento e upload de imagens anexadas**.

## 🌟 Funcionalidades Principais

- ✅ **Conversão de notas** do Google Keep para formato de mindmap
- ✅ **Múltiplos projetos por tipo** (desenvolvimento, ideias, marketing, etc.)
- ✅ **Detecção automática de categorias** baseada nos labels do Google Keep
- ✅ **Processamento de imagens anexadas** com integração ao Supabase Storage
- ✅ **Preservação de metadados** (datas, status fixado/arquivado)
- ✅ **Geração inteligente de conexões** entre notas relacionadas
- ✅ **Posicionamento automático** dos nós em grid
- ✅ **Validação** do JSON de saída

## 📊 Resultados da Última Conversão

✅ **Conversão Concluída com Sucesso!**
- **545** arquivos JSON encontrados no Google Keep
- **512** arquivos processados com sucesso  
- **33** arquivos pulados (sem conteúdo relevante)
- **10** projetos criados por categoria
- **Imagens:** Detectadas e processadas automaticamente
- **Arquivo gerado:** `data/import/keep-import.json`

## 🚀 Como Usar

```bash
cd scripts
node keep-to-mindmap.js ../references/Keep ../data/import
```

## 🖼️ Processamento de Imagens

### Como Funciona
1. **Detecção:** O script identifica automaticamente imagens anexadas nas notas (`attachments` no JSON)
2. **Referenciamento:** Gera markdown com referências locais: `![Imagem anexada](./images/nome-da-imagem.png)`
3. **Metadados:** Preserva informações sobre as imagens nos metadados dos nós
4. **Upload (Opcional):** Script separado faz upload para Supabase Storage

### Tipos Suportados
- 📷 **PNG** - Formato principal do Google Keep
- 📷 **JPG/JPEG** - Imagens comprimidas
- 📷 **GIF** - Imagens animadas
- 📷 **WEBP** - Formato moderno

### Exemplo de Nota com Imagem
```markdown
# Título da Nota

Conteúdo da nota aqui...

## 📷 Imagens

![Imagem anexada](./images/1749680434266.293950068.png)

---
*Tipos: marketing | Criado: 12/04/2024 | 🖼️ 1 imagem*
```

## 📁 Estrutura de Arquivos

```
alotth.com/
├── scripts/
│   ├── keep-to-mindmap.js     # Script principal de conversão
│   ├── upload-keep-images.js  # Script de upload de imagens
│   ├── package.json           # Configuração npm
│   └── README.md             # Este arquivo
├── references/Keep/           # Arquivos originais do Google Keep
│   ├── *.json                # Notas exportadas
│   ├── *.png                 # Imagens anexadas
│   └── *.jpg                 # Outras imagens
└── data/import/              # Arquivos convertidos
    ├── keep-import.json      # JSON pronto para importação
    ├── keep-metadata.json    # Metadados detalhados
    └── image-url-mapping.json # Mapeamento URLs (após upload)
```

## 🎯 Projetos Criados por Categoria

O script organiza automaticamente suas notas em projetos temáticos:

| Projeto | Emoji | Descrição | Labels |
|---------|-------|-----------|---------|
| **Development** | 💻 | Código, funções, programação | `dev`, `codigo`, `function` |
| **Ideas & Projects** | 💡 | Ideias de negócio, projetos | `ideias`, `projetos` |
| **Marketing & Sales** | 📈 | Marketing digital, vendas | `mkt digital`, `engajei` |
| **Shopping & Lists** | 🛒 | Listas de compras | `compras`, `lista` |
| **Health & Medicine** | 🏥 | Saúde, medicina | `saude`, `medico` |
| **Crypto & Investments** | 💰 | Criptomoedas, investimentos | `crypto`, `investimentos` |
| **Tasks & TODOs** | ✅ | Tarefas, lembretes | `tasks`, `todo` |
| **Studies & Learning** | 📚 | Estudos, cursos | `estudo`, `livro` |
| **Travel** | ✈️ | Viagens, turismo | `travel`, `thailand` |
| **Creative** | 🎨 | Arte, criatividade | `arte`, `design` |
| **Recipes** | 🍳 | Receitas culinárias | `receita`, `culinaria` |
| **General Notes** | 📄 | Outras notas | *sem label específico* |

## 📋 Formatos de Saída

### 1. Arquivo Principal (`keep-import.json`)
```json
[
  {
    "title": "💻 Development",
    "description": "Notas sobre desenvolvimento e programação",
    "is_pinned": true,
    "nodes": [
      {
        "content": "# Função JavaScript\n\n```js\nfunction exemplo() {\n  return 'Hello';\n}\n```\n\n## 📷 Imagens\n\n![Código](./images/screenshot.png)",
        "position": { "x": 0, "y": 0 },
        "is_pinned": false,
        "is_archived": false
      }
    ],
    "edges": [
      { "source": 0, "target": 1 }
    ]
  }
]
```

### 2. Metadados (`keep-metadata.json`)
```json
{
  "conversionSummary": {
    "processedNotes": 512,
    "totalProjects": 10,
    "totalImagesCount": 45,
    "totalImageFiles": 67
  },
  "nodeMetadata": [
    {
      "originalTitle": "Nota com Imagem",
      "contentTypes": ["dev"],
      "hasImages": true,
      "attachedImages": [
        {
          "filePath": "1749680434266.293950068.png",
          "mimetype": "image/png",
          "localPath": "/path/to/Keep/1749680434266.293950068.png"
        }
      ]
    }
  ]
}
```

## 🔧 Configuração do Upload de Imagens

### Variáveis de Ambiente Necessárias
```bash
# .env.local (na raiz do projeto)
NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua_anon_key_aqui"
```

### Políticas de Storage no Supabase
O projeto já tem as políticas configuradas para o bucket `images`:
- ✅ Upload permitido para usuários autenticados
- ✅ Visualização pública
- ✅ Limite de 10MB por arquivo

## 📈 Estatísticas de Conversão

Exemplo dos resultados típicos:

```
📊 Resumo da Conversão:
- 📁 Arquivos encontrados: 545
- ✅ Processados: 512 notas únicas
- 🔄 Total de cópias criadas: 587 nós
- ⏭️  Pulados: 33
- 📂 Projetos criados: 10
- 📌 Fixadas: 65
- 📦 Arquivadas: 129
- 🖼️  Notas com imagens: 12
- 📷 Total de imagens: 18
- 🔗 Conexões criadas: 221
```

## 🔧 Personalização

### Adicionar Novos Tipos de Projeto
```javascript
// Em keep-to-mindmap.js, na função detectContentTypes()
const labelMap = {
  // Adicione seus próprios labels aqui
  'meu_label': 'meu_tipo',
  'outro_label': 'outro_tipo'
};
```

### Personalizar Processamento de Imagens
```javascript
// Em processAttachedImages()
const imageMarkdown = `![${altText}](./images/${attachment.filePath})`;
```

## 🚨 Troubleshooting

### Problemas com Imagens
```bash
# Verificar se as imagens existem
ls references/Keep/*.png references/Keep/*.jpg

# Verificar permissões
ls -la references/Keep/
```

### Erro de Upload
```bash
# Verificar configuração do Supabase
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Performance
- **Conversão:** ~100 notas por segundo
- **Upload:** ~2 imagens por segundo (inclui pausa de 500ms)

## 🔄 Fluxo Completo de Importação

1. **Exportar do Google Keep:** Incluir imagens no download
2. **Executar conversão:** `npm run convert-keep`
3. **Upload de imagens (opcional):** `node upload-keep-images.js`
4. **Importar no mindmap:** Usar `keep-import.json`
5. **Atualizar URLs (se fez upload):** Usar `image-url-mapping.json`

## 📦 Dependências

```json
{
  "turndown": "^7.1.1",           // HTML para Markdown
  "@supabase/supabase-js": "^2.x" // Upload de imagens (opcional)
}
```

---

💡 **Dica:** As imagens são preservadas com suas referências originais. Se fizer upload para Supabase, use o arquivo `image-url-mapping.json` para atualizar as URLs nos nós importados. 

# Scripts para Conversão e Import

Este diretório contém scripts utilitários para converter dados do Google Keep em formato de mindmap e fazer upload de imagens para o Supabase Storage.

## Scripts Disponíveis

### 1. `keep-to-mindmap.js` ⭐ **PRINCIPAL**
Converte notas do Google Keep para formato JSON compatível com o sistema de mindmap **COM UPLOAD AUTOMÁTICO DE IMAGENS**.

**Uso:**
```bash
# Configure as variáveis de ambiente primeiro
export NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Execute o script
node keep-to-mindmap.js [diretório-keep] [diretório-output]
```

**Funcionalidades:**
- ✅ Converte notas HTML para Markdown
- ✅ Agrupa notas por tipo baseado em labels
- ✅ **Upload automático de imagens para Supabase** 🆕
- ✅ **URLs corretas das imagens no conteúdo** 🆕
- ✅ Gera conexões inteligentes entre notas
- ✅ Preserva metadados (fixado, arquivado, datas)
- ✅ **JSON pronto para importação direta** 🆕

### 2. `upload-keep-images.js` (Opcional)
⚠️ **DESNECESSÁRIO se usar o fluxo principal** - Mantido para compatibilidade.

### 3. `apply-image-urls.js` (Opcional)
⚠️ **DESNECESSÁRIO se usar o fluxo principal** - Mantido para compatibilidade.

## 🚀 Fluxo Simplificado (RECOMENDADO)

### Passo 1: Configurar Ambiente
```bash
export NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Passo 2: Processar e Upload em Uma Etapa
```bash
# Um comando faz tudo: converte + upload + gera JSON final
node keep-to-mindmap.js ./references/Keep ./data/import/
```

### Passo 3: Importar na Aplicação
1. Acesse `/admin/project` no seu sistema
2. Clique em "Import Projects"
3. Cole o conteúdo do arquivo `./data/import/keep-import.json`
4. Execute o import - **as imagens já estão funcionando!** ✨

## 📊 Resultados do Processamento

O script gera automaticamente:

```
data/import/
├── keep-import.json         # 📂 ARQUIVO PRINCIPAL para importar
├── keep-metadata.json       # 📋 Metadados e estatísticas
└── [Individual projects by type available in original script]
```

### Exemplo de Saída:
```
📊 Resumo da Conversão:
- 📁 Arquivos encontrados: 127
- ✅ Processados: 89 notas únicas
- 📂 Projetos criados: 8
- 🖼️  Notas com imagens: 12
- 📷 Total de imagens: 23
- 📤 Imagens uploadadas: 23/23
- ☁️  Status: URLs do Supabase aplicadas automaticamente
- 🔗 Conexões criadas: 45

🎉 Conversão concluída!
📂 Para importar no mindmap, use: ./data/import/keep-import.json
✨ O JSON está pronto para importação direta na aplicação!
```

## 🖼️ Como Funciona o Upload de Imagens

### Fluxo Automático:
1. **Detecção**: Script encontra imagens anexadas nas notas
2. **Upload**: Cada imagem é enviada para `supabase.storage/images/import/`
3. **URL**: URLs do Supabase substituem referências locais
4. **Markdown**: Conteúdo já tem URLs corretas: `![Imagem](https://supabase.url/...)`

### Estrutura no Supabase Storage:
```
images/
└── import/
    └── keep-import/
        ├── 1703123456789-screenshot.png
        ├── 1703123457123-diagram.jpg
        └── ...
```

### Exemplo de Conversão:
```markdown
# Antes (Keep local)
![Imagem anexada](./images/attachment.png)

# Depois (Supabase automático)
![Imagem anexada](https://your-project.supabase.co/storage/v1/object/public/images/import/keep-import/1703123456789-attachment.png)
```

## 🔧 Configuração de Ambiente

### Obrigatório para Upload Automático:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Sem Configuração:
- ✅ Script funciona normalmente
- ⚠️ Usa URLs locais (necessário upload manual depois)
- 💡 Mostra instruções para configurar

## 📝 Tipos de Projeto Gerados

O script automaticamente categoriza suas notas em:

- 💻 **Desenvolvimento** - code, dev, programming, tech
- 💡 **Ideias e Projetos** - ideas, startup, business, planos
- 📈 **Marketing e Vendas** - marketing, social, vendas
- 🛒 **Compras e Listas** - shopping, lista, mercado
- ✅ **Tarefas e TODOs** - tasks, todo, agenda
- 📚 **Estudos** - study, curso, livro
- ✈️ **Viagens** - travel, trip, hotel
- 🏥 **Saúde** - health, medico, remedio
- 💰 **Crypto e Investimentos** - crypto, bitcoin, investment
- 🎨 **Arte e Criatividade** - art, creative
- 🍳 **Receitas** - receita, cooking
- 📄 **Notas Gerais** - outras categorias

## 🆚 Comparação de Fluxos

### ✅ Fluxo Novo (Recomendado)
```bash
# 1 comando = tudo pronto
node keep-to-mindmap.js ./references/Keep ./data/import/
# → Importar JSON na aplicação
```

### ❌ Fluxo Antigo (Complexo)
```bash
# 4 comandos separados
node keep-to-mindmap.js ./references/Keep ./data/import/
node upload-keep-images.js ./data/import/keep-metadata.json ./references/Keep
node apply-image-urls.js ./data/import/image-url-mapping.json
# → Importar JSON na aplicação
```

## 🚨 Troubleshooting

### Erro de Upload
```
⚠️ Falha no upload de image.png: message
```
**Solução:** Verifique variáveis de ambiente e permissões do Supabase

### Imagens não aparecem
1. ✅ Confirme upload: veja logs `📤 ✅ Upload: file.png → URL`
2. ✅ Verifique Supabase Storage no dashboard
3. ✅ Teste URL da imagem diretamente no browser

### Sem variáveis de ambiente
```
⚠️ Supabase não configurado - URLs locais serão usadas
```
**Resultado:** Script funciona mas usa URLs locais - configure para upload automático

## 💡 Dicas

### Para Desenvolvedores:
- Use `.env` local para as variáveis do Supabase
- O script detecta automaticamente se pode fazer upload
- Logs detalhados mostram progresso de cada imagem

### Para Usuários:
- Configure uma vez e esqueça
- JSON gerado já tem tudo funcionando
- Um script resolve tudo 