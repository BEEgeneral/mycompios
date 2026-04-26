/**
 * MyCompi Lead Generation - Apollo.io Free Tier
 * Maximiza extracción de leads con cuenta gratuita
 */

const APOLLO_KEY = '-Bjmtvu2uQjh6TVWrVPe6A';

async function apolloPOST(endpoint, body) {
  const res = await fetch(`https://api.apollo.io/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'X-Api-Key': APOLLO_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ api_key: APOLLO_KEY, ...body })
  });
  return res.json();
}

/**
 * Search contacts with keywords + location
 */
async function searchContacts(qKeywords, locationCountry = 'Spain', page = 1) {
  return apolloPOST('contacts/search', {
    q_keywords: qKeywords,
    locations: [{ country: locationCountry }],
    page,
    per_page: 25,
    sort_by_field: 'last_activity_date',
    sort_order: 'desc'
  });
}

/**
 * Search organizations in Spain
 */
async function searchOrgs(q, page = 1) {
  return apolloPOST('organizations/search', {
    q,
    page,
    per_page: 25
  });
}

/**
 * Score a contact for MyCompi
 */
function score(contact) {
  let s = 0;
  if (contact.email_status === 'verified') s += 4;
  if (contact.linkedin_url) s += 1;
  
  const org = contact.account || contact.organization || {};
  if (org.website_url && !org.website_url.match(/facebook|linkedin|twitter/i)) s += 3;
  if (org.country === 'Spain') s += 2;
  if (org.headcount) {
    const hc = parseInt(org.headcount) || 0;
    if (hc >= 2 && hc <= 200) s += 2; // PYME range
  }
  
  // Title scoring
  const title = (contact.title || '').toLowerCase();
  if (title.match(/ceo|fundador|director|gerente|propietario/i)) s += 3;
  if (title.match(/marketing|ventas|comercial/i)) s += 2;
  
  return s;
}

/**
 * Extract contact data
 */
function extract(contact) {
  const org = contact.account || contact.organization || {};
  return {
    nombre: contact.name || '',
    email: contact.email || '',
    titulo: contact.title || '',
    empresa: org.name || '',
    website: org.website_url || '',
    pais: org.country || '',
    linkedin: contact.linkedin_url || '',
    telefono: contact.phone_numbers?.[0]?.raw_number || '',
    score: contact._score || 0,
    fuente: 'apollo'
  };
}

/**
 * Main lead generation run
 */
async function run() {
  console.log('=== MyCompi Lead Generation ===\n');
  
  const allContacts = [];
  const seenEmails = new Set();
  
  // Keyword combinations for Spanish PYMES
  const queries = [
    { q_keywords: ['marketing digital'], page: 1 },
    { q_keywords: ['ecommerce tienda online'], page: 1 },
    { q_keywords: ['agencia digital'], page: 1 },
    { q_keywords: ['consultoria empresa'], page: 1 },
    { q_keywords: ['software tecnologia'], page: 1 },
    { q_keywords: ['servicios profesionales'], page: 1 },
    { q_keywords: ['comercio minorista'], page: 1 },
    { q_keywords: ['restaurante hotel'], page: 1 },
    { q_keywords: ['construccion inmobiliar'], page: 1 },
    { q_keywords: ['finance advisor'], page: 1 },
    { q_keywords: ['abogado abogado'], page: 1 },
    { q_keywords: ['doctor clinic'], page: 1 }
  ];
  
  for (const { q_keywords, page } of queries) {
    try {
      console.log(`Searching: ${q_keywords.join(', ')}...`);
      const result = await searchContacts(q_keywords, 'Spain', page);
      const contacts = result.contacts || [];
      
      for (const c of contacts) {
        c._score = score(c);
        if (c.email && !seenEmails.has(c.email.toLowerCase())) {
          seenEmails.add(c.email.toLowerCase());
          allContacts.push(c);
        }
      }
      
      console.log(`  -> ${contacts.length} contacts, total unique: ${allContacts.length}`);
      
      // Respect rate limits - wait between calls
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(`  -> Error: ${e.message}`);
    }
  }
  
  // Deduplicate and sort by score
  allContacts.sort((a, b) => (b._score || 0) - (a._score || 0));
  
  console.log(`\n=== Results: ${allContacts.length} unique leads ===\n`);
  
  // Show top 10
  console.log('Top leads:');
  for (const c of allContacts.slice(0, 10)) {
    const org = c.account || c.organization || {};
    console.log(`  [${c._score}] ${c.name} - ${c.title} @ ${org.name} (${c.email})`);
  }
  
  // Generate CSV
  const csvHeader = 'nombre,email,titulo,empresa,website,pais,linkedin,telefono,score,fuente\n';
  const csvRows = allContacts.map(c => {
    const org = c.account || c.organization || {};
    return [
      escapeCsv(c.name || ''),
      escapeCsv(c.email || ''),
      escapeCsv(c.title || ''),
      escapeCsv(org.name || ''),
      escapeCsv(org.website_url || ''),
      escapeCsv(org.country || ''),
      escapeCsv(c.linkedin_url || ''),
      escapeCsv(c.phone_numbers?.[0]?.raw_number || ''),
      c._score || 0,
      'apollo'
    ].join(',');
  }).join('\n');
  
  const csv = csvHeader + csvRows;
  
  // Save to file
  const fs = require('fs');
  fs.writeFileSync('/data/.openclaw/workspace/mycompios/leads-apollo.csv', csv);
  console.log(`\nCSV saved to leads-apollo.csv (${allContacts.length} leads)`);
  
  // Also save JSON for programmatic use
  const leads = allContacts.map(extract);
  fs.writeFileSync('/data/.openclaw/workspace/mycompios/leads-apollo.json', JSON.stringify(leads, null, 2));
  
  return { leads: allContacts, csv };
}

function escapeCsv(s) {
  return String(s).replace(/"/g, '""');
}

// Run
run().then(r => {
  console.log(`\nDone! ${r.leads.length} leads generated.`);
  process.exit(0);
}).catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});