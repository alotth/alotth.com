const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Função para ler .env manualmente
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}

// Carregar variáveis do arquivo .env
loadEnvFile();

// Configuração do Supabase (deve ser fornecida via .env)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
let uploadEnabled = false;

// Inicializar Supabase se as variáveis estiverem disponíveis
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  uploadEnabled = true;
  console.log('✅ Supabase configurado - Upload de imagens habilitado');
} else {
  console.log('⚠️  Supabase não configurado - URLs locais serão usadas');
  console.log('💡 Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para upload automático');
}

// Função para fazer upload de uma imagem para o Supabase
async function uploadImageToSupabase(localPath, fileName, userId = 'import') {
  if (!uploadEnabled) {
    return null;
  }

  try {
    // Ler o arquivo
    const fileBuffer = fs.readFileSync(localPath);
    
    // Gerar nome único para o arquivo
    const fileExt = path.extname(fileName);
    const timestamp = Date.now();
    const uniqueName = `${userId}/keep-import/${timestamp}-${fileName}`;
    
    // Upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(uniqueName, fileBuffer, {
        contentType: getMimeType(fileExt),
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.warn(`⚠️ Falha no upload de ${fileName}:`, error.message);
      return null;
    }
    
    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(uniqueName);
    
    console.log(`📤 ✅ Upload: ${fileName} → ${publicUrl}`);
    return publicUrl;
    
  } catch (error) {
    console.warn(`⚠️ Erro no upload de ${fileName}:`, error.message);
    return null;
  }
}

// Função para determinar MIME type baseado na extensão
function getMimeType(fileExt) {
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return mimeTypes[fileExt.toLowerCase()] || 'image/jpeg';
}

// Função para processar imagens anexadas
async function processAttachedImages(keepNote, keepDir) {
  const processedImages = [];
  
  if (keepNote.attachments && keepNote.attachments.length > 0) {
    for (const attachment of keepNote.attachments) {
      if (attachment.mimetype && attachment.mimetype.startsWith('image/')) {
        const imagePath = path.join(keepDir, attachment.filePath);
        
        // Verificar se a imagem existe
        if (fs.existsSync(imagePath)) {
          let imageUrl = `./images/${attachment.filePath}`; // Fallback para URL local
          let imageMarkdown = `![Imagem anexada](${imageUrl})`;
          
          // Tentar fazer upload para Supabase se habilitado
          if (uploadEnabled) {
            const supabaseUrl = await uploadImageToSupabase(imagePath, attachment.filePath);
            if (supabaseUrl) {
              imageUrl = supabaseUrl;
              imageMarkdown = `![Imagem anexada](${supabaseUrl})`;
            }
          }
          
          processedImages.push({
            filePath: attachment.filePath,
            mimetype: attachment.mimetype,
            markdown: imageMarkdown,
            localPath: imagePath,
            supabaseUrl: imageUrl,
            uploaded: uploadEnabled && imageUrl.includes('supabase')
          });
        } else {
          console.warn(`⚠️  Imagem não encontrada: ${attachment.filePath}`);
        }
      }
    }
  }
  
  return processedImages;
}

// Função para limpar HTML tags e converter para Markdown básico
function htmlToMarkdown(html) {
  if (!html) return '';
  
  return html
    // Remover tags HTML mas preservar quebras de linha
    .replace(/<\/p>/g, '\n\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/h[1-6]>/g, '\n\n')
    .replace(/<h([1-6])[^>]*>/g, (match, level) => '#'.repeat(parseInt(level)) + ' ')
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/g, '_$1_')
    .replace(/<i[^>]*>(.*?)<\/i>/g, '_$1_')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
    .replace(/<[^>]*>/g, '') // Remove todas as outras tags HTML
    // Limpar entidades HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Limpar espaços e quebras excessivas
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
}

// Função para calcular posição dos nós em grid
function calculatePosition(index, nodesPerRow = 5, spacing = 300) {
  const row = Math.floor(index / nodesPerRow);
  const col = index % nodesPerRow;
  return {
    x: col * spacing,
    y: row * spacing
  };
}

// Função para detectar TODOS os tipos de conteúdo baseado em labels (retorna array)
function detectContentTypes(textContent, title, labels = []) {
  const matchedTypes = new Set(); // Usar Set para evitar duplicatas
  
  // Usar apenas labels do Google Keep para categorização
  if (labels && labels.length > 0) {
    const labelNames = labels.map(label => label.name.toLowerCase());
    
    // Mapear labels para tipos de projeto (baseado em Labels.txt + outros comuns)
    const labelMap = {
      // Desenvolvimento
      'dev': 'dev', 'development': 'dev', 'code': 'dev', 'programming': 'dev',
      'javascript': 'dev', 'python': 'dev', 'node': 'dev', 'docker': 'dev',
      'tech': 'dev', 'tecnologia': 'dev', 'programacao': 'dev',
      
      // Ideias e projetos
      'ideias': 'ideas', 'ideas': 'ideas', 'ide': 'ideas', 'idei': 'ideas',
      'projetos': 'ideas', 'projects': 'ideas', 'startup': 'ideas', 
      'negocio': 'ideas', 'business': 'ideas', 'planos': 'ideas',
      'criativo': 'ideas', 'creative': 'ideas',
      
      // Marketing e engajamento  
      'marketing': 'marketing', 'engajei': 'marketing', 'engagement': 'marketing',
      'social': 'marketing', 'post': 'marketing', 'instagram': 'marketing',
      'vendas': 'marketing', 'sales': 'marketing', 'cliente': 'marketing',
      'mkt digital': 'marketing',
      
      // Compras
      'compras': 'shopping', 'shopping': 'shopping', 'lista': 'shopping',
      'mercado': 'shopping', 'item': 'shopping', 'preco': 'shopping',
      
      // Tarefas e organização
      'tarefas': 'tasks', 'todo': 'tasks', 'fazer': 'tasks', 'lembrar': 'tasks',
      'agenda': 'tasks', 'reminder': 'tasks', 'organização': 'tasks',
      
      // Estudos e aprendizado
      'estudo': 'study', 'study': 'study', 'curso': 'study', 'course': 'study',
      'aprender': 'study', 'learn': 'study', 'livro': 'study', 'book': 'study',
      'universidade': 'study', 'university': 'study',
      
      // Viagem
      'viagem': 'travel', 'travel': 'travel', 'trip': 'travel', 'thailand': 'travel',
      'thai': 'travel', 'hotel': 'travel', 'passaporte': 'travel',
      
      // Saúde e medicina
      'saude': 'health', 'health': 'health', 'medico': 'health', 'doctor': 'health',
      'remedio': 'health', 'medicine': 'health', 'tratamento': 'health',
      
      // Crypto e investimentos
      'crypto': 'crypto', 'bitcoin': 'crypto', 'eth': 'crypto', 'investment': 'crypto',
      'investimento': 'crypto', 'investimentos': 'crypto', 'wallet': 'crypto', 'coin': 'crypto',
      
      // IA e tecnologia
      'ia': 'dev', 'ai': 'dev', 'modelo': 'dev',
      
      // Arte e criatividade
      'arte': 'creative', 'art': 'creative',
      
      // Receitas e culinária
      'receita': 'recipes', 'cooking': 'recipes', 'culinaria': 'recipes',
      
      // Separação/Organização
      'sep': 'tasks', 'separacao': 'tasks',
      
      // Computer Graphics
      'cg': 'dev', 'graphics': 'dev', 'design': 'dev'
    };
    
    // Procurar por TODOS os matches exatos nos labels
    for (const labelName of labelNames) {
      if (labelMap[labelName]) {
        matchedTypes.add(labelMap[labelName]);
      }
    }
    
    // Se não encontrou match direto, tentar labels que contenham palavras-chave
    if (matchedTypes.size === 0) {
      for (const labelName of labelNames) {
        for (const [key, type] of Object.entries(labelMap)) {
          if (labelName.includes(key) || key.includes(labelName)) {
            matchedTypes.add(type);
          }
        }
      }
    }
  }
  
  // Se não tem labels ou não encontrou match, vai para "general"
  return matchedTypes.size > 0 ? Array.from(matchedTypes) : ['general'];
}

// Função para criar uma única nota como nó
async function createNodeFromKeepNote(keepNote, index, keepDir) {
  const title = keepNote.title || '';
  const textContent = htmlToMarkdown(keepNote.textContent || keepNote.textContentHtml || '');
  
  // Se não há conteúdo útil, retornar null
  if (!textContent && !title) {
    return null;
  }
  
  // Criar conteúdo do nó em Markdown
  let nodeContent = '';
  
  if (title && title.trim() !== '') {
    nodeContent = `# ${title}\n\n`;
  }
  
  if (textContent && textContent.trim() !== '') {
    nodeContent += textContent;
  }
  
  // Se ainda não há conteúdo, usar título genérico
  if (!nodeContent.trim()) {
    return null;
  }
  
  // Processar imagens anexadas
  const processedImages = await processAttachedImages(keepNote, keepDir);
  if (processedImages.length > 0) {
    nodeContent += '\n\n## 📷 Imagens\n\n';
    processedImages.forEach(img => {
      nodeContent += `${img.markdown}\n\n`;
    });
  }
  
  // Adicionar informações sobre outros anexos se existirem
  const nonImageAttachments = (keepNote.attachments || []).filter(att => 
    !att.mimetype || !att.mimetype.startsWith('image/')
  );
  if (nonImageAttachments.length > 0) {
    nodeContent += '\n\n## 📎 Outros Anexos\n\n';
    nonImageAttachments.forEach(att => {
      nodeContent += `- 📎 ${att.filePath} (${att.mimetype})\n`;
    });
  }
  
  // Adicionar metadados como comentário no final
  const createdDate = new Date(keepNote.createdTimestampUsec / 1000).toLocaleDateString('pt-BR');
  const editedDate = new Date(keepNote.userEditedTimestampUsec / 1000).toLocaleDateString('pt-BR');
  const contentTypes = detectContentTypes(textContent, title, keepNote.labels);
  
  nodeContent += `\n\n---\n`;
  nodeContent += `*Tipos: ${contentTypes.join(', ')} | Criado: ${createdDate} | Editado: ${editedDate}`;
  
  if (keepNote.isPinned) nodeContent += ' | 📌 Fixado';
  if (keepNote.isArchived) nodeContent += ' | 📦 Arquivado';
  
  nodeContent += '*';
  
  return {
    content: nodeContent.trim(),
    position: calculatePosition(index),
    metadata: {
      originalTitle: title,
      contentTypes, // Array com todos os tipos
      isPinned: keepNote.isPinned,
      isArchived: keepNote.isArchived,
      createdDate,
      editedDate,
      attachedImages: processedImages,
      hasImages: processedImages.length > 0
    }
  };
}

// Função para gerar edges conectando nós próximos e por tipo
function generateIntelligentEdges(nodes) {
  // Retornar array vazio para permitir criação manual de conexões
  return [];
}

// Função principal para converter todas as notas em projetos por tipo
async function convertKeepNotesToProjectsByType(keepDir, outputDir) {
  if (!fs.existsSync(keepDir)) {
    console.error(`Diretório não encontrado: ${keepDir}`);
    return;
  }
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const files = fs.readdirSync(keepDir).filter(file => file.endsWith('.json'));
  console.log(`📁 Encontrados ${files.length} arquivos JSON do Keep`);
  
  const nodes = [];
  let processedCount = 0;
  let skippedCount = 0;
  const typeStats = {};
  
  // Processar cada arquivo
  for (const file of files) {
    try {
      const filePath = path.join(keepDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const keepNote = JSON.parse(fileContent);
      
      // Filtrar notas na lixeira ou sem conteúdo
      if (keepNote.isTrashed || (!keepNote.textContent && !keepNote.title)) {
        skippedCount++;
        console.log(`⏭️  Pulado: ${file} (lixeira ou sem conteúdo)`);
        continue;
      }
      
      const node = await createNodeFromKeepNote(keepNote, nodes.length, keepDir);
      if (node) {
        nodes.push(node);
        processedCount++;
        
        // Contar tipos (agora pode ter múltiplos)
        const types = node.metadata.contentTypes;
        types.forEach(type => {
          typeStats[type] = (typeStats[type] || 0) + 1;
        });
        
        const imageIndicator = node.metadata.hasImages ? '🖼️' : '';
        console.log(`✅ ${processedCount.toString().padStart(3, '0')}: ${node.metadata.originalTitle || 'Sem título'} ${imageIndicator} (${types.join(', ')})`);
      } else {
        skippedCount++;
        console.log(`⏭️  Pulado: ${file} (sem conteúdo válido)`);
      }
    } catch (error) {
      console.error(`❌ Erro ao processar ${file}:`, error.message);
      skippedCount++;
    }
  }
  
  // Agrupar notas por tipo (agora uma nota pode aparecer em múltiplos tipos)
  const nodesByType = {};
  nodes.forEach(node => {
    const types = node.metadata.contentTypes;
    types.forEach(type => {
      if (!nodesByType[type]) nodesByType[type] = [];
      // Criar uma cópia do nó para cada tipo
      nodesByType[type].push({
        ...node,
        metadata: {
          ...node.metadata,
          primaryType: type // Indicar qual é o tipo primário para este projeto
        }
      });
    });
  });
  
  // Definir informações dos tipos
  const typeInfo = {
    'dev': { emoji: '💻', title: 'Desenvolvimento', desc: 'Código, scripts e desenvolvimento técnico' },
    'ideas': { emoji: '💡', title: 'Ideias e Projetos', desc: 'Ideias criativas e projetos futuros' },
    'shopping': { emoji: '🛒', title: 'Compras e Listas', desc: 'Listas de compras e itens para adquirir' },
    'health': { emoji: '🏥', title: 'Saúde e Medicina', desc: 'Informações de saúde, remédios e cuidados' },
    'marketing': { emoji: '📈', title: 'Marketing e Vendas', desc: 'Estratégias de marketing e crescimento' },
    'crypto': { emoji: '💰', title: 'Crypto e Investimentos', desc: 'Criptomoedas e investimentos financeiros' },
    'tasks': { emoji: '✅', title: 'Tarefas e TODOs', desc: 'Tarefas pendentes e lembretes importantes' },
    'study': { emoji: '📚', title: 'Estudos e Aprendizado', desc: 'Materiais de estudo e aprendizado' },
    'travel': { emoji: '✈️', title: 'Viagens', desc: 'Planejamento de viagens e lugares' },
    'creative': { emoji: '🎨', title: 'Arte e Criatividade', desc: 'Projetos artísticos e criativos' },
    'recipes': { emoji: '🍳', title: 'Receitas e Culinária', desc: 'Receitas e dicas culinárias' },
    'general': { emoji: '📄', title: 'Notas Gerais', desc: 'Informações diversas e notas variadas' }
  };
  
  // Criar projetos por tipo
  const projects = [];
  
  Object.entries(nodesByType).forEach(([type, typeNodes]) => {
    const info = typeInfo[type] || { emoji: '📄', title: 'Outros', desc: 'Outros tipos de conteúdo' };
    
    // Recalcular posições para cada projeto (resetar grid)
    const projectNodes = typeNodes.map((node, index) => ({
      content: node.content,
      position: calculatePosition(index),
      is_pinned: node.metadata.isPinned || false,
      is_archived: node.metadata.isArchived || false
    }));
    
    // Gerar edges para este projeto específico
    const projectEdges = generateIntelligentEdges(typeNodes.map((node, index) => ({
      ...node,
      originalIndex: index
    })));
    
    // Calcular estatísticas do projeto
    const pinnedCount = typeNodes.filter(node => node.metadata.isPinned).length;
    const archivedCount = typeNodes.filter(node => node.metadata.isArchived).length;
    
    // Criar descrição do projeto
    let description = `# ${info.emoji} ${info.title}\n\n`;
    description += `${info.desc}\n\n`;
    description += `Este projeto contém **${typeNodes.length} notas** do tipo **${type}**.\n\n`;
    
    if (pinnedCount > 0 || archivedCount > 0) {
      description += `## 📊 Status das Notas\n\n`;
      if (pinnedCount > 0) description += `- 📌 **Fixadas:** ${pinnedCount} notas\n`;
      if (archivedCount > 0) description += `- 📦 **Arquivadas:** ${archivedCount} notas\n`;
      description += '\n';
    }
    
    description += `## ℹ️ Informações\n\n`;
    description += `- **Conexões:** ${projectEdges.length} links entre notas\n`;
    description += `- **Convertido em:** ${new Date().toLocaleDateString('pt-BR')}\n`;
    description += `- **Fonte:** Google Keep Export`;
    
    // Criar o projeto
    const project = {
      title: `${info.emoji} ${info.title}`,
      description,
      is_pinned: type === 'ideas' || type === 'dev', // Fixar projetos importantes
      is_archived: false,
      nodes: projectNodes,
      edges: projectEdges
    };
    
    projects.push(project);
  });
  
  // Calcular estatísticas gerais (contar nós originais, não cópias)
  const totalPinnedCount = nodes.filter(node => node.metadata.isPinned).length;
  const totalArchivedCount = nodes.filter(node => node.metadata.isArchived).length;
  const totalEdges = projects.reduce((sum, p) => sum + p.edges.length, 0);
  const totalNodeCopies = projects.reduce((sum, p) => sum + p.nodes.length, 0);
  const totalImagesCount = nodes.filter(node => node.metadata.hasImages).length;
  const totalImageFiles = nodes.reduce((sum, node) => sum + (node.metadata.attachedImages?.length || 0), 0);
  const uploadedImagesCount = nodes.reduce((sum, node) => {
    return sum + (node.metadata.attachedImages?.filter(img => img.uploaded)?.length || 0);
  }, 0);
  
  // Salvar resultado
  const outputFile = path.join(outputDir, 'keep-import.json');
  fs.writeFileSync(outputFile, JSON.stringify(projects, null, 2));
  
  // Salvar também metadados para análise
  const metadataFile = path.join(outputDir, 'keep-metadata.json');
  fs.writeFileSync(metadataFile, JSON.stringify({
    totalNodes: nodes.length,
    totalProjects: projects.length,
    typeStats,
    processedCount,
    skippedCount,
    totalPinnedCount,
    totalArchivedCount,
    conversionDate: new Date().toISOString(),
    projectBreakdown: projects.map(p => ({
      title: p.title,
      nodeCount: p.nodes.length,
      edgeCount: p.edges.length,
      isPinned: p.is_pinned
    })),
    nodeMetadata: nodes.map(node => node.metadata)
  }, null, 2));
  
  console.log(`\n📊 Resumo da Conversão:`);
  console.log(`- 📁 Arquivos encontrados: ${files.length}`);
  console.log(`- ✅ Processados: ${processedCount} notas únicas`);
  console.log(`- 🔄 Total de cópias criadas: ${totalNodeCopies} nós`);
  console.log(`- ⏭️  Pulados: ${skippedCount}`);
  console.log(`- 📂 Projetos criados: ${projects.length}`);
  console.log(`- 📌 Fixadas: ${totalPinnedCount}`);
  console.log(`- 📦 Arquivadas: ${totalArchivedCount}`);
  console.log(`- 🖼️  Notas com imagens: ${totalImagesCount}`);
  console.log(`- 📷 Total de imagens: ${totalImageFiles}`);
  if (uploadEnabled) {
    console.log(`- 📤 Imagens uploadadas: ${uploadedImagesCount}/${totalImageFiles}`);
    console.log(`- ☁️  Status: URLs do Supabase aplicadas automaticamente`);
  } else {
    console.log(`- ⚠️  URLs locais usadas (configure Supabase para upload automático)`);
  }
  console.log(`- 🔗 Conexões criadas: ${totalEdges}`);
  console.log(`- 📄 Arquivo principal: ${outputFile}`);
  console.log(`- 📋 Metadados: ${metadataFile}`);
  
  console.log(`\n📁 Projetos criados:`);
  projects
    .sort((a, b) => b.nodes.length - a.nodes.length)
    .forEach(project => {
      const pinnedIcon = project.is_pinned ? '📌' : '  ';
      console.log(`  ${pinnedIcon} ${project.title}: ${project.nodes.length} notas, ${project.edges.length} conexões`);
    });
  
  return outputFile;
}

// Função para validar o JSON gerado
function validateOutput(outputFile) {
  try {
    const content = fs.readFileSync(outputFile, 'utf8');
    const data = JSON.parse(content);
    
    console.log('\n🔍 Validando saída...');
    
    if (!Array.isArray(data)) {
      throw new Error('Saída deve ser um array de projetos');
    }
    
    if (data.length === 0) {
      throw new Error('Deve haver pelo menos 1 projeto');
    }
    
    data.forEach((project, projectIndex) => {
      if (!project.title) throw new Error(`Projeto ${projectIndex}: Título obrigatório`);
      if (!project.nodes || !Array.isArray(project.nodes)) {
        throw new Error(`Projeto ${projectIndex} (${project.title}): Deve ter array de nodes`);
      }
      
      // Validar edges
      if (project.edges) {
        project.edges.forEach(edge => {
          if (edge.source >= project.nodes.length || edge.target >= project.nodes.length || 
              edge.source < 0 || edge.target < 0) {
            throw new Error(`Projeto ${projectIndex} (${project.title}): Edge inválido - source: ${edge.source}, target: ${edge.target}, nodes: ${project.nodes.length}`);
          }
        });
      }
      
      // Validar posições dos nós
      project.nodes.forEach((node, nodeIndex) => {
        if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
          throw new Error(`Projeto ${projectIndex} (${project.title}), Nó ${nodeIndex}: Posição inválida`);
        }
      });
      
      // Validar propriedades específicas do projeto
      if (typeof project.is_pinned !== 'boolean') {
        throw new Error(`Projeto ${projectIndex} (${project.title}): is_pinned deve ser boolean`);
      }
      if (typeof project.is_archived !== 'boolean') {
        throw new Error(`Projeto ${projectIndex} (${project.title}): is_archived deve ser boolean`);
      }
    });
    
    console.log('✅ Validação passou! JSON está no formato correto.');
    return true;
  } catch (error) {
    console.error('❌ Erro na validação:', error.message);
    return false;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const keepDir = process.argv[2] || './references/Keep';
  const outputDir = process.argv[3] || './data/import';
  
  console.log('🚀 Iniciando conversão Google Keep → Mindmap (Projetos por Tipo + Imagens)...\n');
  
  (async () => {
    try {
      const outputFile = await convertKeepNotesToProjectsByType(keepDir, outputDir);
      if (outputFile) {
        validateOutput(outputFile);
        
        console.log('\n🎉 Conversão concluída!');
        console.log('📂 Para importar no mindmap, use:', outputFile);
        console.log('💡 Suas notas foram organizadas automaticamente por tipo!');
        
        if (uploadEnabled) {
          console.log('🖼️  As imagens foram automaticamente enviadas para o Supabase!');
          console.log('✨ O JSON está pronto para importação direta na aplicação!');
          console.log('\n📋 Próximos passos:');
          console.log('  1. Acesse /admin/project na sua aplicação');
          console.log('  2. Clique em "Import Projects"');
          console.log('  3. Cole o conteúdo do arquivo JSON');
          console.log('  4. Execute o import - as imagens já estão no Supabase!');
        } else {
          console.log('🖼️  Imagens referenciadas com URLs locais.');
          console.log('⚠️  Configure as variáveis do Supabase para upload automático.');
          console.log('\n📋 Para upload automático das próximas vezes:');
          console.log('  export NEXT_PUBLIC_SUPABASE_URL=your_url');
          console.log('  export NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key');
        }
      }
    } catch (error) {
      console.error('❌ Erro durante a conversão:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  convertKeepNotesToProjectsByType,
  validateOutput,
  htmlToMarkdown,
  detectContentTypes
}; 