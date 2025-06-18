# Guia de Importação de Dados para Mindmap

Este guia explica como converter dados de diferentes fontes (Google Keep, Notion, Evernote, etc.) para o formato JSON aceito pelo sistema de mindmap.

## Formato JSON Esperado

```json
[
  {
    "title": "Título do Projeto",
    "description": "Descrição do projeto usando **Markdown**",
    "nodes": [
      {
        "content": "Conteúdo do nó usando Markdown",
        "position": { "x": 0, "y": 0 }
      }
    ],
    "edges": [
      { "source": 0, "target": 1 }
    ]
  }
]
```

## Estrutura de Dados

- **title**: Nome do projeto/mindmap
- **description**: Descrição geral usando Markdown
- **nodes**: Array de nós do mindmap
  - **content**: Conteúdo do nó em Markdown
  - **position**: Posição x,y do nó no canvas
- **edges**: Conexões entre nós
  - **source**: Índice do nó de origem (baseado em 0)
  - **target**: Índice do nó de destino

## Convertendo de Diferentes Fontes

### Google Keep

1. Exporte suas notas do Google Keep
2. Para cada nota principal:
   - Use o título da nota como `title`
   - Use o conteúdo principal como `description`
   - Para notas relacionadas/sub-itens:
     - Crie um `node` para cada sub-nota
     - Use o conteúdo da sub-nota como `content`
     - Crie `edges` conectando notas relacionadas

```javascript
// Exemplo de script de conversão
function convertKeepToMindmap(keepNotes) {
  return keepNotes.map(note => ({
    title: note.title,
    description: note.content,
    nodes: note.subNotes.map((subNote, index) => ({
      content: subNote.content,
      position: { x: index * 200, y: 0 }
    })),
    edges: note.subNotes.slice(1).map((_, index) => ({
      source: index,
      target: index + 1
    }))
  }));
}
```

### Notion

1. Exporte a página do Notion como Markdown
2. Para cada página:
   - Use o título da página como `title`
   - Use o conteúdo principal como `description`
   - Para sub-páginas/blocos:
     - Crie um `node` para cada sub-página/bloco
     - Mantenha a hierarquia usando `edges`

```javascript
// Exemplo de script de conversão
function convertNotionToMindmap(notionPages) {
  return notionPages.map(page => ({
    title: page.title,
    description: page.content,
    nodes: page.blocks.map((block, index) => ({
      content: block.content,
      position: calculatePosition(index)
    })),
    edges: generateEdgesFromHierarchy(page.blocks)
  }));
}
```

### Formato Universal de Texto

Para fontes sem estrutura definida, você pode usar um formato de texto simples:

```text
# Título do Projeto
## Descrição
Sua descrição aqui

## Nós
- Primeiro nó
- Segundo nó
  - Conecta com: Primeiro nó
- Terceiro nó
  - Conecta com: Segundo nó
```

```javascript
// Exemplo de parser universal
function parseUniversalFormat(text) {
  const lines = text.split('\n');
  const title = lines[0].replace('# ', '');
  const description = getDescriptionBlock(lines);
  const { nodes, edges } = parseNodesAndEdges(lines);
  
  return {
    title,
    description,
    nodes,
    edges
  };
}
```

## Dicas de Conversão

1. **Markdown**: Todo o conteúdo textual suporta Markdown
   - Use `**texto**` para negrito
   - Use `_texto_` para itálico
   - Use `![alt](url)` para imagens
   - Use `[texto](url)` para links

2. **Posicionamento**:
   - Se não souber as posições exatas, distribua os nós em grade
   - Exemplo: `{ x: index * 200, y: Math.floor(index / 3) * 150 }`

3. **Conexões**:
   - Crie edges baseados em:
     - Hierarquia de documentos
     - Tags compartilhadas
     - Links explícitos entre documentos
     - Referências cruzadas

4. **Imagens**:
   - Suporta URLs de imagens no Markdown
   - Converta imagens locais para URLs acessíveis

## Exemplos Práticos

### Exemplo 1: Projeto Simples

```json
{
  "title": "Meu Projeto",
  "description": "Visão geral do projeto",
  "nodes": [
    {
      "content": "# Objetivo\n- Ponto 1\n- Ponto 2",
      "position": { "x": 0, "y": 0 }
    },
    {
      "content": "## Implementação\nDetalhes aqui",
      "position": { "x": 250, "y": 0 }
    }
  ],
  "edges": [
    { "source": 0, "target": 1 }
  ]
}
```

### Exemplo 2: Projeto com Imagens

```json
{
  "title": "Documentação Visual",
  "description": "Projeto com imagens e diagramas",
  "nodes": [
    {
      "content": "# Diagrama Principal\n![Diagrama](https://exemplo.com/diagrama.png)",
      "position": { "x": 0, "y": 0 }
    },
    {
      "content": "## Explicação\nDetalhes do diagrama",
      "position": { "x": 300, "y": 0 }
    }
  ],
  "edges": [
    { "source": 0, "target": 1 }
  ]
}
```

## Validação

Antes de importar, verifique se:

1. O JSON é válido
2. Todos os nós têm posições definidas
3. Os índices dos edges são válidos
4. Todo o conteúdo Markdown está corretamente formatado
5. As URLs das imagens são acessíveis

## Scripts de Ajuda

Você pode criar scripts simples para automatizar a conversão:

```javascript
// Exemplo de validador
function validateMindmapJSON(data) {
  // Verifica estrutura básica
  if (!Array.isArray(data)) throw new Error('Deve ser um array de projetos');
  
  data.forEach((project, index) => {
    if (!project.title) throw new Error(`Projeto ${index}: Título obrigatório`);
    if (!project.nodes) throw new Error(`Projeto ${index}: Nós obrigatórios`);
    
    // Valida edges
    project.edges?.forEach(edge => {
      if (edge.source >= project.nodes.length || edge.target >= project.nodes.length) {
        throw new Error(`Projeto ${index}: Edge inválido`);
      }
    });
  });
  
  return true;
}
```

## Recursos Adicionais

- [Documentação do Markdown](https://www.markdownguide.org/)
- [JSON Schema Validator](https://www.jsonschemavalidator.net/)
- [Ferramentas de Conversão Online](https://exemplo.com/tools)

## Suporte

Para dúvidas ou problemas na importação:
1. Verifique se o JSON está no formato correto
2. Use o validador para identificar problemas
3. Consulte os exemplos neste documento 