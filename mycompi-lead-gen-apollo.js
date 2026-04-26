/**
 * MyCompi Lead Generation via Apollo.io
 * Busca empresas españolas para outreach automatizado
 */

const APOLLO_KEY = '-Bjmtvu2uQjh6TVWrVPe6A';

async function apolloSearch(params) {
  const response = await fetch('https://api.apollo.io/v1/contacts/search', {
    method: 'POST',
    headers: {
      'X-Api-Key': APOLLO_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      api_key: APOLLO_KEY,
      ...params
    })
  });
  return response.json();
}

/**
 * Busca empresas españolas por sector
 */
async function buscarLeadsPorSector(sector, page = 1) {
  const params = {
    q_organization_domains: sector,
    page,
    per_page: 25,
    organization_locations: ['Spain'],
    organization_keywords: [sector],
    // Solo empresas con website (presencia digital)
    enriched_only: true
  };
  
  return apolloSearch(params);
}

/**
 * Lead scoring para MyCompi
 * Criterios: tamaño, edad, presencia digital
 */
function scoreLead(contact) {
  let score = 0;
  
  // Factores positivos
  if (contact.organization_name) score += 2;
  if (contact.email_status === 'verified') score += 3;
  if (contact.linkedin_url) score += 1;
  
  // Factores de empresa (del organization)
  const org = contact.account || contact.organization;
  if (org) {
    // Website existe = presencia digital
    if (org.website_url && !org.website_url.includes('facebook') && !org.website_url.includes('linkedin')) {
      score += 2;
    }
    // País España
    if (org.country === 'Spain' || org.country_code === 'ES') score += 2;
  }
  
  return score;
}

/**
 * Export leads to CSV format for MyCompi
 */
function leadsToCSV(leads) {
  const header = 'nombre,email,titulo,empresa,sector,website,linkedin,score,notas\n';
  const rows = leads.map(l => {
    const org = l.account || l.organization || {};
    return [
      l.name || '',
      l.email || '',
      l.title || '',
      org.name || '',
      org.sic_codes ? org.sic_codes[0] : '',
      org.website_url || '',
      l.linkedin_url || '',
      l._score || 0,
      ''
    ].join(',');
  });
  return header + rows.join('\n');
}

/**
 * MAIN: Buscar leads para MyCompi
 */
async function generarLeadsMycompi() {
  console.log('Buscando leads para MyCompi...');
  
  // Sectores objetivo: PYMES españolas
  const sectores = [
    'consultoria',
    'marketing',
    'servicios profesionales',
    'software',
    'ecommerce',
    'tienda online',
    'agencia digital'
  ];
  
  const todosLeads = [];
  
  for (const sector of sectores) {
    console.log(`Buscando: ${sector}...`);
    try {
      const result = await buscarLeadsPorSector(sector);
      const contacts = result.contacts || [];
      
      for (const c of contacts) {
        c._score = scoreLead(c);
      }
      
      // Filtrar solo los mejor scoreados
      const mejorados = contacts.filter(c => c._score >= 5);
      todosLeads.push(...mejorados);
      
      console.log(`  -> ${contacts.length} encontrados, ${mejorados.length} con score >= 5`);
    } catch (e) {
      console.error(`Error buscando ${sector}: ${e.message}`);
    }
  }
  
  // Deduplicar por email
  const unique = [];
  const seen = new Set();
  for (const l of todosLeads) {
    if (!seen.has(l.email)) {
      seen.add(l.email);
      unique.push(l);
    }
  }
  
  // Ordenar por score
  unique.sort((a, b) => b._score - a._score);
  
  console.log(`\nTotal leads unicos: ${unique.length}`);
  
  // Guardar CSV
  const csv = leadsToCSV(unique);
  console.log(csv);
  
  return { leads: unique, csv };
}

// Run if called directly
if (require.main === module) {
  generarLeadsMycompi().then(r => {
    console.log('\nCSV generado!');
  }).catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
}

module.exports = { generarLeadsMycompi, buscarLeadsPorSector, scoreLead };