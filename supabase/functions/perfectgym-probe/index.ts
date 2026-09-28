// Sonda di sola lettura sull'API di PerfectGym, prima di configurare il mirror.
//
// Stessa sonda usata per Athlon, piu' il catalogo: per ognuno dei 129 entity
// set dello Swagger 2.2 dice se l'API risponde, se ha `version` (e quindi si
// puo' scaricare a delta) o solo `id`, quante righe ha e quali campi porta.
//
// Esce solo cio' che serve a configurare: conteggi, nomi dei campi, status.
// Nessun valore delle righe esce da qui.
//
// Si chiama con una chiave segreta del progetto o con il token del Vault
// (`x-sync-token`), cosi' la si puo' lanciare dal database con pg_net.
//
//   ?test=catalogo              tutti gli entity set
//   ?test=catalogo&entita=A,B   solo quelli
//   ?test=raffica               20 chiamate ravvicinate, per vedere un 429
//   ?test=verifica&entita=MemberCards&da=0&a=5000
//                               $count contro righe davvero ricevute su un intervallo di id
//   ?test=mancanti&entita=Contracts&tabella=contracts&da=0&a=99999
//                               id (e version) che l'API ha e il mirror no, e viceversa

import postgres from 'npm:postgres@3.4.5'
import { chiaveSegreta } from '../_shared/solo-servizio.ts'

const BASE = Deno.env.get('PERFECTGYM_URL') ?? 'https://passion.perfectgym.com/Api/v2.2'
const CLIENT_ID = Deno.env.get('PERFECTGYM_CLIENT_ID') ?? ''
const CLIENT_SECRET = Deno.env.get('PERFECTGYM_CLIENT_SECRET') ?? ''

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 1 })

// Gli entity set OData dello Swagger "PerfectGym API v2.2".
const CATALOGO = [
  'ActivityCategories', 'ActivityEmployeeLevels', 'ActivityMemberLevels', 'ActivityMemberSkills',
  'ActivitySkillProgressionStages', 'ActivitySkills', 'ApplicationDictionaryValues', 'CancelReasons',
  'CashlessBonusStages', 'CashlessDebitPosTransactions', 'Cities', 'ClassAgeLimits', 'ClassBookings',
  'ClassCategories', 'ClassRatings', 'ClassTypeAppAvailabilities', 'ClassTypeRatingSummaries', 'ClassTypes',
  'Classes', 'ClubContacts', 'ClubCustomAttributes', 'ClubEquipment', 'ClubEquipmentTranslations',
  'ClubFacilities', 'ClubFacilityTranslations', 'ClubOpeningHours', 'ClubOpeningHoursExceptions', 'ClubPhotos',
  'ClubRegions', 'ClubTranslations', 'ClubTypes', 'ClubUrls', 'ClubZoneAvailabilities', 'ClubZoneTypes',
  'ClubZones', 'Clubs', 'Companies', 'CompanyInvoiceItems', 'CompanyInvoices', 'ContractCharges',
  'ContractDiscountAssignments', 'ContractDiscountDefinitions', 'ContractFreezes', 'ContractPayments',
  'Contracts', 'Countries', 'Crm2ConsultantAvailability', 'Crm2Events', 'Crm2Leads', 'CrmLeadSources',
  'CrmLeads', 'CustomAttributeDefinitions', 'DeferredRevenueSettlements', 'DeferredRevenues', 'EPaymentKeys',
  'EPaymentTransactions', 'EmployeeAvailabilitySlots', 'EmployeePositionTranslations', 'EmployeePositions',
  'EmployeeTranslations', 'Employees', 'FacilityBookingCancelReasons', 'FacilityBookingDefinitions',
  'FacilityBookingRuleAvailabilityDayPeriods', 'FacilityBookingRuleAvailabilityDays',
  'FacilityBookingRuleAvailabilityHourPeriods', 'FacilityBookingRuleAvailabilityHours',
  'FacilityBookingRuleLimits', 'FacilityBookingRulePricingScheduleItems', 'FacilityBookingRules',
  'FacilityBookings', 'FreezeReasons', 'FreezeTypes', 'GroupEnrollments', 'GroupVacancyBlocks', 'Groups',
  'InstructorClubs', 'Instructors', 'InvoiceItems', 'Invoices', 'MemberAgreementAnswers',
  'MemberAgreementChannels', 'MemberAgreementTranslations', 'MemberAgreements', 'MemberBalances',
  'MemberBiometricData', 'MemberCards', 'MemberClubVisits', 'MemberCustomAttributes', 'MemberFiles',
  'MemberMarketingSources', 'MemberNotes', 'MemberPhotos', 'MemberProductStateDeliveryChanges',
  'MemberProducts', 'MemberPushNotifications', 'MemberRelations', 'MemberTags', 'Members', 'MembersInClub',
  'MembershipAddons', 'MembershipRules', 'MembershipTypes', 'OnlineGateTransactions', 'PaymentPlanCategories',
  'PaymentPlanTags', 'PaymentPlanTranslations', 'PaymentPlans', 'PersonalTrainingBookings',
  'PersonalTrainingDefinitions', 'PosStations', 'PrepaidTransactions', 'ProductBarcodes',
  'ProductCatalogCategories', 'ProductCatalogCategoriesProducts', 'ProductCatalogCategoryAppAvailabilities',
  'ProductCategories', 'Products', 'ReferralCampaigns', 'Semesters', 'States', 'TransactionPayments',
  'TransactionTypes', 'Transactions', 'UnitsOfMeasure', 'VatRates', 'WarehouseChanges', 'WarehouseStates',
  'Warehouses',
]

type Risposta = { status: number; ms: number; json?: Record<string, unknown>; errore?: string; headers?: Record<string, string> }

async function chiama(percorso: string): Promise<Risposta> {
  const t0 = Date.now()
  try {
    const r = await fetch(`${BASE}/odata/${percorso}`, {
      headers: { 'X-Client-Id': CLIENT_ID, 'X-Client-Secret': CLIENT_SECRET, Accept: 'application/json' },
    })
    const headers: Record<string, string> = {}
    r.headers.forEach((v, k) => {
      if (/rate|retry|limit|throttl/i.test(k)) headers[k] = v
    })
    const testo = await r.text()
    const ms = Date.now() - t0
    if (!r.ok) return { status: r.status, ms, headers, errore: testo.slice(0, 200) }
    return { status: r.status, ms, headers, json: JSON.parse(testo) }
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, errore: String(e).slice(0, 200) }
  }
}

// Per un entity set: prima col cursore `version`, poi con `id`, poi senza ordine.
async function esamina(e: string) {
  const tentativi: [string, string][] = [
    ['version', `${e}?$filter=version gt 0&$orderby=version&$top=1&$count=true`],
    ['id', `${e}?$orderby=id&$top=1&$count=true`],
    ['nessuno', `${e}?$top=1&$count=true`],
  ]
  const errori: Record<string, string> = {}
  for (const [cursore, url] of tentativi) {
    const r = await chiama(url)
    if (r.json) {
      const value = (r.json.value ?? []) as Record<string, unknown>[]
      const prima = value[0] ?? {}
      return {
        cursore,
        count: r.json['@odata.count'] ?? null,
        ms: r.ms,
        campi: Object.keys(prima),
        ha_id: 'id' in prima,
        ha_version: 'version' in prima,
        ha_isDeleted: 'isDeleted' in prima,
        ...(Object.keys(errori).length ? { errori } : {}),
      }
    }
    errori[cursore] = `${r.status} ${r.errore ?? ''}`.trim()
  }
  return { cursore: null, errori }
}

async function catalogo(scelte: string[] | null) {
  const coda = [...(scelte ?? CATALOGO)]
  const out: Record<string, unknown> = {}
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (coda.length) {
      const e = coda.shift()!
      out[e] = await esamina(e)
    }
  }))
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
}

async function raffica() {
  const esiti: unknown[] = []
  for (let i = 0; i < 20; i++) {
    const r = await chiama(`Clubs?$top=1&$select=id`)
    esiti.push({ i, status: r.status, ms: r.ms, headers: r.headers })
    if (r.status === 429) break
  }
  return esiti
}

async function verifica(e: string, da: string, a: string) {
  // Su un intervallo di id: quante righe dice `$count`, quante ne arrivano
  // davvero seguendo le pagine, e quante sono doppie. Esce solo il conteggio.
  const filtro = `id gt ${da} and id le ${a}`
  const conta = await chiama(`${e}?$filter=${filtro}&$count=true&$top=1&$select=id`)
  const visti = new Map<number, number>()
  let url: string | null = `${BASE}/odata/${e}?$filter=${filtro}&$orderby=id&$select=id`
  let righe = 0
  let pagine = 0
  while (url && pagine < 40) {
    const r = await fetch(url, { headers: { 'X-Client-Id': CLIENT_ID, 'X-Client-Secret': CLIENT_SECRET, Accept: 'application/json' } })
    if (!r.ok) return { errore: `${r.status} ${(await r.text()).slice(0, 200)}` }
    const json = await r.json()
    for (const x of json.value ?? []) visti.set(x.id, (visti.get(x.id) ?? 0) + 1)
    righe += json.value?.length ?? 0
    pagine++
    url = json['@odata.nextLink'] ?? null
  }
  const doppi = [...visti.values()].filter((v) => v > 1).length
  return { count_api: conta.json?.['@odata.count'] ?? null, righe_ricevute: righe, id_distinti: visti.size, id_doppi: doppi, pagine, completo: url === null }
}

// Le righe dell'API che il mirror non ha, su un intervallo di id: solo id e
// version, nessun altro campo.
async function mancanti(e: string, tabella: string, da: string, a: string) {
  const filtro = `id gt ${da} and id le ${a}`
  const api = new Map<number, number | null>()
  let url: string | null = `${BASE}/odata/${e}?$filter=${filtro}&$orderby=id&$select=id,version`
  let pagine = 0
  while (url && pagine < 40) {
    const r = await fetch(url, { headers: { 'X-Client-Id': CLIENT_ID, 'X-Client-Secret': CLIENT_SECRET, Accept: 'application/json' } })
    if (!r.ok) return { errore: `${r.status} ${(await r.text()).slice(0, 200)}` }
    const json = await r.json()
    for (const x of json.value ?? []) api.set(x.id, x.version ?? null)
    pagine++
    url = json['@odata.nextLink'] ?? null
  }
  if (!/^[a-z0-9_]+$/.test(tabella)) return { errore: 'tabella non valida' }
  const nelMirror = new Set(
    (await sql.unsafe(`select id from perfectgym.${tabella} where id > $1 and id <= $2`, [da, a])).map((r) => Number(r.id)),
  )
  const cursore = await sql`select s.cursore from perfectgym.sync_stato s where s.entita = ${e}`
  return {
    api: api.size,
    mirror: nelMirror.size,
    cursore_del_sync: cursore[0]?.cursore ?? null,
    solo_api: [...api].filter(([id]) => !nelMirror.has(id)).map(([id, version]) => ({ id, version })),
    solo_mirror: [...nelMirror].filter((id) => !api.has(id)),
    completo: url === null,
  }
}

async function autorizzato(req: Request): Promise<boolean> {
  if (chiaveSegreta(req)) return true
  const token = req.headers.get('x-sync-token')
  if (!token) return false
  const [r] = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'perfectgym_sync_token'`
  return Boolean(r) && r.decrypted_secret === token
}

Deno.serve(async (req) => {
  if (!(await autorizzato(req))) return new Response('Non autorizzato', { status: 401 })
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return Response.json({ errore: 'Mancano i secret PERFECTGYM_CLIENT_ID / PERFECTGYM_CLIENT_SECRET' }, { status: 500 })
  }
  const q = new URL(req.url).searchParams
  const test = q.get('test') ?? 'catalogo'
  const scelte = q.get('entita')?.split(',').filter(Boolean) ?? null
  const t0 = Date.now()
  const risultato: Record<string, unknown> = { base: BASE }
  if (test === 'catalogo') risultato.catalogo = await catalogo(scelte)
  if (test === 'raffica') risultato.raffica = await raffica()
  if (test === 'verifica') {
    risultato.verifica = await verifica(scelte?.[0] ?? 'MemberCards', q.get('da') ?? '0', q.get('a') ?? '5000')
  }
  if (test === 'mancanti') {
    const [e, tabella] = [scelte?.[0] ?? 'Contracts', q.get('tabella') ?? 'contracts']
    risultato.mancanti = await mancanti(e, tabella, q.get('da') ?? '0', q.get('a') ?? '9999999999')
  }
  risultato.durata_ms = Date.now() - t0
  return Response.json(risultato)
})
