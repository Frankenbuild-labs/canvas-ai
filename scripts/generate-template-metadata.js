const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '../public/templates');

const categoryMap = {
  // Forms and Legal
  'form': ['form', 'application', 'agreement', 'contract', 'waiver', 'consent', 'release', 'license', 'llc', 'loan', 'will', 'testament'],
  // Business Documents
  'document': ['letter', 'memo', 'resume', 'proposal', 'report', 'certificate', 'checklist', 'notes', 'itinerary', 'schedule', 'sheet', 'invitation', 'card', 'tag', 'list', 'tree'],
  // Spreadsheets
  'spreadsheet': ['budget', 'expense', 'invoice', 'payroll', 'financial', 'calculator', 'tracker', 'planner', 'chart', 'dashboard', 'timeline'],
  // Presentations
  'presentation': ['presentation', 'slide', 'deck', 'summary', 'analysis', 'plan']
};

function categorizeTemplate(filename) {
  const lower = filename.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      return category;
    }
  }
  
  return 'document'; // default
}

function cleanName(filename) {
  // Remove hash suffix like _7871c15f3c
  let name = filename.replace(/\.[^.]+$/, '').replace(/_[a-f0-9]{10,}$/i, '');
  // Replace underscores with spaces
  name = name.replace(/_/g, ' ');
  // Capitalize words
  name = name.replace(/\b\w/g, l => l.toUpperCase());
  return name;
}

function generateDescription(name, category) {
  const descriptions = {
    form: `Fillable ${name} form template ready to use`,
    document: `Professional ${name} document template`,
    spreadsheet: `${name} spreadsheet with formulas and formatting`,
    presentation: `${name} presentation template with professional slides`
  };
  return descriptions[category] || `${name} template`;
}

const templates = [];
const categories = [
  { id: 'all', name: 'All Templates', count: 0 },
  { id: 'form', name: 'Form', count: 0 },
  { id: 'document', name: 'Document', count: 0 },
  { id: 'spreadsheet', name: 'Spreadsheet', count: 0 },
  { id: 'presentation', name: 'Presentation', count: 0 }
];

// Scan each type folder
['docx', 'xlsx', 'pptx', 'pdf'].forEach(type => {
  const dir = path.join(templatesDir, type);
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir).filter(f => f !== 'sample.' + type);
  
  files.forEach(file => {
    const filename = file;
    const cleanFilename = cleanName(file);
    const category = categorizeTemplate(file);
    const ext = type === 'pptx' ? 'pptx' : type === 'xlsx' ? 'xlsx' : type === 'docx' ? 'docx' : 'pdf';
    
    templates.push({
      id: file.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: cleanFilename,
      description: generateDescription(cleanFilename, category),
      category: category,
      type: ext,
      path: `/templates/${type}/${encodeURIComponent(file)}`,
      thumbnail: `/templates/${type}/${encodeURIComponent(file)}`,
      featured: false
    });
  });
});

// Update category counts
templates.forEach(t => {
  const cat = categories.find(c => c.id === t.category);
  if (cat) cat.count++;
});
categories[0].count = templates.length;

const output = {
  categories,
  templates
};

fs.writeFileSync(
  path.join(templatesDir, 'templates.json'),
  JSON.stringify(output, null, 2)
);

console.log(`Generated metadata for ${templates.length} templates`);
console.log(`Categories:`, categories.map(c => `${c.name}: ${c.count}`).join(', '));
