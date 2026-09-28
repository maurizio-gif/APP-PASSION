-- Il mirror di PerfectGym: cosa scaricare
--
-- Una riga per entity set. Si parte dalla configurazione di Athlon com'era la
-- sera del 28/09/2026 (51 entita', colonne tipizzate comprese), e si aggiunge
-- tutto il resto dello Swagger 2.2 che ha una chiave `id`: 118 entity set su
-- 129, piu' MemberLevels (i soci con i loro livelli, letti da Members).
--
-- Il catalogo l'ha fatto la sonda (`perfectgym-probe?test=catalogo`) il
-- 28/09/2026 su passion.perfectgym.com: tutti i 129 entity set rispondono;
-- quelli senza `version` rifiutano il filtro con un 400 e si leggono per `id`.
-- Per gli entity set ancora vuoti chiave e `version` vengono dallo Swagger.
--
-- Restano fuori, di proposito:
--   - Cities (2,3 milioni di righe, senza `version`): e' il dizionario mondiale
--     delle citta' di PerfectGym, non un dato di Passion. Rileggerlo da capo ogni
--     giorno costerebbe 4.600 pagine per niente;
--   - ClubTranslations, ClubEquipmentTranslations, ClubFacilityTranslations,
--     EmployeePositionTranslations, EmployeeTranslations, PaymentPlanTranslations,
--     MemberAgreementTranslations: non hanno un `id`, la chiave e' (entita',
--     lingua). Sono i nomi tradotti di cose che il mirror ha gia';
--   - EPaymentKeys: le chiavi dei pagamenti elettronici. Nessun uso, e non
--     conviene tenerne una copia;
--   - MemberBiometricData: dati biometrici. Oggi e' vuota; non si copia;
--   - MembersInClub: il contatore di chi e' in sala adesso, una riga che cambia
--     a ogni ingresso. Chi e' dentro si ricava da MemberClubVisits.
--
-- `intervallo_minuti`: soci, contratti e pagamenti ogni 2 minuti, le attivita'
-- quotidiane ogni 5-10, i dizionari ogni ora. Le entita' lette per `id`
-- raccolgono comunque le righe nuove (id piu' alto) a ogni intervallo; la
-- rilettura da capo (`riscansione_ore`) serve a vedere le modifiche.
--
-- Progetto Supabase: Passion Fitness (tihpfycrkjtuppbmcqew).

insert into perfectgym.entita (nome, tabella, chiave, cursore, colonne, ordine, attiva, intervallo_minuti, riscansione_ore, percorso, filtro, espandi, note) values
  -- Le anagrafiche piccole (come Athlon)
  ('Clubs', 'clubs', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 10, true, 60, null, null, null, null, null),
  ('Employees', 'employees', 'id', 'version', '[{"tipo": "text", "campo": "firstName", "colonna": "nome"}, {"tipo": "text", "campo": "lastName", "colonna": "cognome"}, {"tipo": "boolean", "campo": "isActive", "colonna": "attivo"}, {"tipo": "bigint", "campo": "positionId", "colonna": "position_id"}]', 11, true, 60, null, null, null, null, null),
  ('EmployeePositions', 'employee_positions', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 12, true, 60, null, null, null, null, null),
  ('Instructors', 'instructors', 'id', 'version', '[]', 13, true, 60, null, null, null, null, null),
  ('PaymentPlans', 'payment_plans', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}, {"tipo": "boolean", "campo": "isActive", "colonna": "attivo"}, {"tipo": "boolean", "campo": "isAdditional", "colonna": "aggiuntivo"}, {"tipo": "numeric", "campo": "membershipFee.gross", "colonna": "canone"}, {"tipo": "bigint", "campo": "membershipTypeId", "colonna": "membership_type_id"}]', 14, true, 60, null, null, null, null, null),
  ('PaymentPlanCategories', 'payment_plan_categories', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 15, true, 60, null, null, null, null, null),
  ('MembershipAddons', 'membership_addons', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 16, true, 60, null, null, null, null, null),
  ('Products', 'products', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}, {"tipo": "numeric", "campo": "defaultPriceGross", "colonna": "prezzo"}, {"tipo": "bigint", "campo": "categoryId", "colonna": "category_id"}]', 17, true, 60, null, null, null, null, null),
  ('ProductCategories', 'product_categories', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 18, true, 60, null, null, null, null, null),
  ('ClassTypes', 'class_types', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}, {"tipo": "bigint", "campo": "categoryId", "colonna": "category_id"}]', 19, true, 60, null, null, null, null, null),
  ('ClassCategories', 'class_categories', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 20, true, 60, null, null, null, null, null),
  ('ClubZones', 'club_zones', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 21, true, 60, null, null, null, null, null),
  ('Semesters', 'semesters', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}, {"tipo": "date", "campo": "startDate", "colonna": "data_inizio"}, {"tipo": "date", "campo": "endDate", "colonna": "data_fine"}]', 22, true, 60, null, null, null, null, null),
  ('Groups', 'groups', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}, {"tipo": "bigint", "campo": "semesterId", "colonna": "semester_id"}, {"tipo": "bigint", "campo": "trainerId", "colonna": "trainer_id"}, {"tipo": "date", "campo": "startDate", "colonna": "data_inizio"}, {"tipo": "date", "campo": "endDate", "colonna": "data_fine"}]', 23, true, 60, null, null, null, null, null),
  -- Cursore `id`: quando un socio cambia livello cambia la relazione, non il `version` del livello.
  ('ActivityMemberLevels', 'activity_member_levels', 'id', 'id', '[{"tipo": "text", "campo": "name", "colonna": "nome"}, {"tipo": "int", "campo": "order", "colonna": "ordine"}, {"tipo": "bigint", "campo": "activityCategoryId", "colonna": "activity_category_id"}]', 24, true, 60, 24, null, null, null, null),
  ('MemberAgreements', 'member_agreements', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 25, true, 60, null, null, null, null, null),
  ('VatRates', 'vat_rates', 'id', 'version', '[]', 26, true, 60, null, null, null, null, null),
  ('ApplicationDictionaryValues', 'application_dictionary_values', 'id', 'version', '[{"tipo": "text", "campo": "dictionaryName", "colonna": "dizionario"}, {"tipo": "text", "campo": "key", "colonna": "chiave_valore"}, {"tipo": "text", "campo": "value", "colonna": "valore"}]', 27, true, 60, null, null, null, null, null),
  ('CustomAttributeDefinitions', 'custom_attribute_definitions', 'id', 'id', '[{"tipo": "text", "campo": "displayName", "colonna": "nome"}, {"tipo": "text", "campo": "entityType", "colonna": "entity_type"}]', 30, true, 60, 24, null, null, null, null),
  ('TransactionTypes', 'transaction_types', 'id', 'id', '[]', 31, true, 60, 24, null, null, null, null),
  ('CancelReasons', 'cancel_reasons', 'id', 'id', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 32, true, 60, 24, null, null, null, null),
  ('FreezeReasons', 'freeze_reasons', 'id', 'id', '[]', 33, true, 60, 24, null, null, null, null),
  ('FreezeTypes', 'freeze_types', 'id', 'id', '[]', 34, true, 60, 24, null, null, null, null),
  ('MembershipTypes', 'membership_types', 'id', 'id', '[]', 35, true, 60, 24, null, null, null, null),
  ('CrmLeadSources', 'crm_lead_sources', 'id', 'id', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 36, true, 60, 24, null, null, null, null),

  -- Le anagrafiche piccole che Athlon non scarica
  ('ActivityCategories', 'activity_categories', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 37, true, 60, null, null, null, null, null),
  ('ActivityEmployeeLevels', 'activity_employee_levels', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 37, true, 60, null, null, null, null, null),
  ('ActivitySkills', 'activity_skills', 'id', 'version', '[]', 37, true, 60, null, null, null, null, null),
  ('ActivitySkillProgressionStages', 'activity_skill_progression_stages', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 37, true, 60, null, null, null, null, null),
  ('CashlessBonusStages', 'cashless_bonus_stages', 'id', 'version', '[]', 38, true, 60, null, null, null, null, null),
  ('ClassAgeLimits', 'class_age_limits', 'id', 'version', '[]', 38, true, 60, null, null, null, null, null),
  ('ClassTypeAppAvailabilities', 'class_type_app_availabilities', 'id', 'version', '[{"tipo": "bigint", "campo": "classTypeId", "colonna": "class_type_id"}]', 38, true, 60, null, null, null, null, null),
  ('ClassTypeRatingSummaries', 'class_type_rating_summaries', 'id', 'version', '[{"tipo": "bigint", "campo": "classTypeId", "colonna": "class_type_id"}, {"tipo": "numeric", "campo": "rating", "colonna": "voto"}, {"tipo": "int", "campo": "ratingsCount", "colonna": "voti"}]', 38, true, 60, null, null, null, null, null),
  ('ClubContacts', 'club_contacts', 'id', 'version', '[]', 39, true, 60, null, null, null, null, null),
  ('ClubEquipment', 'club_equipment', 'id', 'version', '[]', 39, true, 60, null, null, null, null, null),
  ('ClubFacilities', 'club_facilities', 'id', 'version', '[]', 39, true, 60, null, null, null, null, null),
  ('ClubOpeningHours', 'club_opening_hours', 'id', 'version', '[{"tipo": "bigint", "campo": "clubId", "colonna": "club_id"}]', 39, true, 60, null, null, null, null, null),
  ('ClubOpeningHoursExceptions', 'club_opening_hours_exceptions', 'id', 'version', '[{"tipo": "bigint", "campo": "clubId", "colonna": "club_id"}]', 39, true, 60, null, null, null, null, null),
  ('ClubPhotos', 'club_photos', 'id', 'version', '[]', 39, true, 60, null, null, null, null, null),
  ('ClubRegions', 'club_regions', 'id', 'version', '[]', 39, true, 60, null, null, null, null, null),
  ('ClubUrls', 'club_urls', 'id', 'version', '[]', 39, true, 60, null, null, null, null, null),
  ('ClubZoneTypes', 'club_zone_types', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 39, true, 60, null, null, null, null, null),
  ('ClubZoneAvailabilities', 'club_zone_availabilities', 'id', 'version', '[{"tipo": "bigint", "campo": "clubZoneId", "colonna": "club_zone_id"}]', 39, true, 30, null, null, null, null, null),
  ('ContractDiscountDefinitions', 'contract_discount_definitions', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}, {"tipo": "boolean", "campo": "isActive", "colonna": "attivo"}]', 40, true, 60, null, null, null, null, null),
  ('InstructorClubs', 'instructor_clubs', 'id', 'version', '[{"tipo": "bigint", "campo": "instructorId", "colonna": "instructor_id"}, {"tipo": "bigint", "campo": "clubId", "colonna": "club_id"}]', 40, true, 60, null, null, null, null, null),
  ('PaymentPlanTags', 'payment_plan_tags', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 40, true, 60, null, null, null, null, null),
  ('ProductBarcodes', 'product_barcodes', 'id', 'version', '[]', 40, true, 60, null, null, null, null, null),
  ('ProductCatalogCategories', 'product_catalog_categories', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 40, true, 60, null, null, null, null, null),
  ('ProductCatalogCategoriesProducts', 'product_catalog_categories_products', 'id', 'version', '[{"tipo": "bigint", "campo": "productId", "colonna": "product_id"}, {"tipo": "bigint", "campo": "categoryId", "colonna": "category_id"}]', 40, true, 60, null, null, null, null, null),
  ('ProductCatalogCategoryAppAvailabilities', 'product_catalog_category_app_availabilities', 'id', 'version', '[]', 40, true, 60, null, null, null, null, null),
  ('WarehouseStates', 'warehouse_states', 'id', 'version', '[{"tipo": "bigint", "campo": "productId", "colonna": "product_id"}, {"tipo": "bigint", "campo": "warehouseId", "colonna": "warehouse_id"}]', 40, true, 60, null, null, null, null, null),
  ('FacilityBookingCancelReasons', 'facility_booking_cancel_reasons', 'id', 'version', '[]', 41, true, 60, null, null, null, null, null),
  ('FacilityBookingDefinitions', 'facility_booking_definitions', 'id', 'version', '[]', 41, true, 60, null, null, null, null, null),
  ('FacilityBookingRules', 'facility_booking_rules', 'id', 'version', '[]', 41, true, 60, null, null, null, null, null),
  ('FacilityBookingRuleLimits', 'facility_booking_rule_limits', 'id', 'version', '[]', 41, true, 60, null, null, null, null, null),
  ('FacilityBookingRuleAvailabilityDays', 'facility_booking_rule_availability_days', 'id', 'version', '[]', 41, true, 60, null, null, null, null, null),
  ('FacilityBookingRuleAvailabilityDayPeriods', 'facility_booking_rule_availability_day_periods', 'id', 'version', '[]', 41, true, 60, null, null, null, null, null),
  ('FacilityBookingRuleAvailabilityHours', 'facility_booking_rule_availability_hours', 'id', 'version', '[]', 41, true, 60, null, null, null, null, null),
  ('FacilityBookingRuleAvailabilityHourPeriods', 'facility_booking_rule_availability_hour_periods', 'id', 'version', '[]', 41, true, 60, null, null, null, null, null),
  ('FacilityBookingRulePricingScheduleItems', 'facility_booking_rule_pricing_schedule_items', 'id', 'version', '[]', 41, true, 60, null, null, null, null, null),
  -- Senza `version`
  ('Countries', 'countries', 'id', 'id', '[{"tipo": "text", "campo": "name", "colonna": "nome"}, {"tipo": "text", "campo": "symbol", "colonna": "sigla"}]', 45, true, 60, 168, null, null, null, null),
  ('States', 'states', 'id', 'id', '[{"tipo": "text", "campo": "name", "colonna": "nome"}, {"tipo": "bigint", "campo": "countryId", "colonna": "country_id"}]', 45, true, 60, 168, null, null, null, null),
  ('ClubTypes', 'club_types', 'id', 'id', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 46, true, 60, 24, null, null, null, null),
  ('MemberAgreementChannels', 'member_agreement_channels', 'id', 'id', '[]', 46, true, 60, 24, null, null, null, null),
  ('MemberMarketingSources', 'member_marketing_sources', 'id', 'id', '[]', 46, true, 60, 24, null, null, null, null),
  ('MemberTags', 'member_tags', 'id', 'id', '[]', 46, true, 60, 24, null, null, null, null),
  ('MembershipRules', 'membership_rules', 'id', 'id', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 46, true, 60, 24, null, null, null, null),
  ('PosStations', 'pos_stations', 'id', 'id', '[]', 46, true, 60, 24, null, null, null, null),
  ('ReferralCampaigns', 'referral_campaigns', 'id', 'id', '[]', 46, true, 60, 24, null, null, null, null),
  ('UnitsOfMeasure', 'units_of_measure', 'id', 'id', '[]', 46, true, 60, 24, null, null, null, null),
  ('Warehouses', 'warehouses', 'id', 'id', '[]', 46, true, 60, 24, null, null, null, null),
  ('ClubCustomAttributes', 'club_custom_attributes', 'id', 'id', '[]', 46, true, 60, 24, null, null, null, null),
  ('GroupVacancyBlocks', 'group_vacancy_blocks', 'id', 'id', '[]', 46, true, 60, 24, null, null, null, null),

  -- Soci e contratti
  ('Members', 'members', 'id', 'version', '[{"tipo": "text", "campo": "number", "indice": true, "colonna": "numero"}, {"tipo": "text", "campo": "firstName", "colonna": "nome"}, {"tipo": "text", "campo": "lastName", "colonna": "cognome"}, {"tipo": "text", "campo": "email", "indice": true, "colonna": "email"}, {"tipo": "text", "campo": "phoneNumber", "colonna": "telefono"}, {"tipo": "text", "campo": "personalId", "indice": true, "colonna": "codice_fiscale"}, {"tipo": "date", "campo": "birthdate", "colonna": "data_nascita"}, {"tipo": "text", "campo": "sex", "colonna": "sesso"}, {"tipo": "text", "campo": "memberType", "colonna": "member_type"}, {"tipo": "boolean", "campo": "isActive", "colonna": "attivo"}, {"tipo": "bigint", "campo": "homeClubId", "colonna": "home_club_id"}, {"tipo": "bigint", "campo": "consultantId", "colonna": "consulente_id"}, {"tipo": "timestamptz", "campo": "createdDate", "colonna": "creato_il"}]', 50, true, 2, null, null, null, null, null),
  ('Contracts', 'contracts', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "bigint", "campo": "paymentPlanId", "indice": true, "colonna": "payment_plan_id"}, {"tipo": "bigint", "campo": "clubId", "colonna": "club_id"}, {"tipo": "text", "campo": "status", "colonna": "stato"}, {"tipo": "boolean", "campo": "isActive", "colonna": "attivo"}, {"tipo": "boolean", "campo": "isAdditionalContract", "colonna": "aggiuntivo"}, {"tipo": "boolean", "campo": "automaticRenew", "colonna": "rinnovo_automatico"}, {"tipo": "bigint", "campo": "consultantId", "colonna": "consulente_id"}, {"tipo": "date", "campo": "signUpDate", "colonna": "data_firma"}, {"tipo": "date", "campo": "startDate", "colonna": "data_inizio"}, {"tipo": "date", "campo": "endDate", "indice": true, "colonna": "data_fine"}, {"tipo": "date", "campo": "cancelDate", "colonna": "data_disdetta"}]', 51, true, 2, null, null, null, null, null),

  -- Incassi, corsi, CRM (come Athlon)
  ('ContractPayments', 'contract_payments', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "bigint", "campo": "contractId", "indice": true, "colonna": "contract_id"}, {"tipo": "timestamptz", "campo": "date", "indice": true, "colonna": "data"}, {"tipo": "numeric", "campo": "amount.gross", "colonna": "importo"}, {"tipo": "boolean", "campo": "isRefund", "colonna": "rimborso"}, {"tipo": "bigint", "campo": "transactionId", "colonna": "transaction_id"}, {"tipo": "bigint", "campo": "transactionTypeId", "colonna": "transaction_type_id"}, {"tipo": "bigint", "campo": "ePaymentId", "colonna": "e_payment_id"}]', 60, true, 2, null, null, null, null, null),
  ('ContractCharges', 'contract_charges', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "bigint", "campo": "contractId", "indice": true, "colonna": "contract_id"}, {"tipo": "text", "campo": "type", "colonna": "tipo"}, {"tipo": "date", "campo": "dueDate", "indice": true, "colonna": "scadenza"}, {"tipo": "numeric", "campo": "amount.gross", "colonna": "importo"}, {"tipo": "numeric", "campo": "leftToPay", "colonna": "da_pagare"}, {"tipo": "boolean", "campo": "isCancelled", "colonna": "annullato"}]', 61, true, 5, null, null, null, null, null),
  ('ContractFreezes', 'contract_freezes', 'id', 'version', '[{"tipo": "bigint", "campo": "contractId", "indice": true, "colonna": "contract_id"}, {"tipo": "date", "campo": "startDate", "colonna": "data_inizio"}, {"tipo": "date", "campo": "endDate", "colonna": "data_fine"}, {"tipo": "bigint", "campo": "freezeTypeId", "colonna": "freeze_type_id"}, {"tipo": "bigint", "campo": "reasonId", "colonna": "reason_id"}]', 62, true, 5, null, null, null, null, null),
  ('Transactions', 'transactions', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "bigint", "campo": "contractId", "indice": true, "colonna": "contract_id"}, {"tipo": "timestamptz", "campo": "date", "indice": true, "colonna": "data"}, {"tipo": "numeric", "campo": "amount.gross", "colonna": "importo"}, {"tipo": "bigint", "campo": "productId", "colonna": "product_id"}, {"tipo": "text", "campo": "contractTransactionType", "colonna": "tipo_contratto"}, {"tipo": "boolean", "campo": "isRefund", "colonna": "rimborso"}, {"tipo": "bigint", "campo": "employeeId", "colonna": "employee_id"}]', 63, true, 2, null, null, null, null, null),
  ('TransactionPayments', 'transaction_payments', 'id', 'version', '[{"tipo": "bigint", "campo": "transactionId", "indice": true, "colonna": "transaction_id"}, {"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "timestamptz", "campo": "date", "indice": true, "colonna": "data"}, {"tipo": "numeric", "campo": "amount.gross", "colonna": "importo"}, {"tipo": "text", "campo": "type", "colonna": "tipo"}, {"tipo": "boolean", "campo": "isRefund", "colonna": "rimborso"}]', 64, true, 2, null, null, null, null, null),
  ('EPaymentTransactions', 'e_payment_transactions', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "numeric", "campo": "grossAmount", "colonna": "importo"}, {"tipo": "text", "campo": "provider", "colonna": "provider"}, {"tipo": "text", "campo": "status", "colonna": "stato"}, {"tipo": "boolean", "campo": "isAdHoc", "colonna": "ad_hoc"}, {"tipo": "timestamptz", "campo": "paymentDate", "indice": true, "colonna": "data_pagamento"}]', 65, true, 5, null, null, null, null, null),
  -- MemberBalances non ha `id`: la chiave e' `memberId`.
  ('MemberBalances', 'member_balances', 'memberId', 'version', '[{"tipo": "numeric", "campo": "currentBalance", "colonna": "saldo"}, {"tipo": "numeric", "campo": "prepaidBalance", "colonna": "saldo_prepagato"}, {"tipo": "timestamptz", "campo": "negativeBalanceSince", "colonna": "negativo_da"}]', 66, true, 5, null, null, null, null, null),
  ('GroupEnrollments', 'group_enrollments', 'id', 'version', '[{"tipo": "bigint", "campo": "groupId", "indice": true, "colonna": "group_id"}, {"tipo": "bigint", "campo": "contractId", "indice": true, "colonna": "contract_id"}, {"tipo": "date", "campo": "startDate", "colonna": "data_inizio"}, {"tipo": "date", "campo": "endDate", "colonna": "data_fine"}]', 67, true, 5, null, null, null, null, null),
  ('Classes', 'classes', 'id', 'version', '[{"tipo": "timestamptz", "campo": "startDate", "indice": true, "colonna": "inizio"}, {"tipo": "timestamptz", "campo": "endDate", "colonna": "fine"}, {"tipo": "bigint", "campo": "classTypeId", "colonna": "class_type_id"}, {"tipo": "bigint", "campo": "instructorId", "colonna": "instructor_id"}, {"tipo": "bigint", "campo": "groupId", "indice": true, "colonna": "group_id"}, {"tipo": "bigint", "campo": "clubZoneId", "colonna": "club_zone_id"}, {"tipo": "int", "campo": "attendeesCount", "colonna": "iscritti"}, {"tipo": "int", "campo": "attendeesLimit", "colonna": "posti"}, {"tipo": "boolean", "campo": "isCourse", "colonna": "corso"}]', 68, true, 10, null, null, null, null, null),
  ('PersonalTrainingDefinitions', 'personal_training_definitions', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}]', 69, true, 60, null, null, null, null, null),
  -- I dettagli (trainer, cliente, orari) stanno in una relazione: senza `$expand` la riga arriva vuota.
  ('PersonalTrainingBookings', 'personal_training_bookings', 'id', 'version', '[{"tipo": "bigint", "campo": "personalTrainingDefinitionId", "colonna": "definition_id"}, {"tipo": "bigint", "campo": "personalTrainingBookingDetails.employeeId", "indice": true, "colonna": "employee_id"}, {"tipo": "bigint", "campo": "personalTrainingBookingDetails.memberId", "indice": true, "colonna": "member_id"}, {"tipo": "timestamptz", "campo": "personalTrainingBookingDetails.startDateOffset", "indice": true, "colonna": "inizio"}, {"tipo": "timestamptz", "campo": "personalTrainingBookingDetails.endDateOffset", "colonna": "fine"}, {"tipo": "boolean", "campo": "personalTrainingBookingDetails.isCancelled", "colonna": "cancellata"}, {"tipo": "boolean", "campo": "personalTrainingBookingDetails.isCompleted", "colonna": "completata"}, {"tipo": "text", "campo": "personalTrainingBookingDetails.name", "colonna": "nome"}]', 70, true, 5, null, null, null, 'personalTrainingBookingDetails', null),
  ('MemberNotes', 'member_notes', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "boolean", "campo": "isAccessBlocked", "colonna": "accesso_bloccato"}]', 71, true, 5, null, null, null, null, null),
  ('MemberRelations', 'member_relations', 'id', 'version', '[{"tipo": "bigint", "campo": "parentMemberId", "indice": true, "colonna": "genitore_id"}, {"tipo": "bigint", "campo": "childMemberId", "indice": true, "colonna": "figlio_id"}, {"tipo": "text", "campo": "relationType", "colonna": "tipo"}, {"tipo": "date", "campo": "dateFrom", "colonna": "dal"}, {"tipo": "date", "campo": "dateUntil", "colonna": "fino_al"}]', 72, true, 5, null, null, null, null, null),
  ('MemberProducts', 'member_products', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "bigint", "campo": "productId", "colonna": "product_id"}, {"tipo": "timestamptz", "campo": "purchaseDate", "colonna": "acquistato_il"}, {"tipo": "timestamptz", "campo": "expiryDate", "colonna": "scade_il"}, {"tipo": "numeric", "campo": "currentQuantity", "colonna": "quantita"}]', 73, true, 10, null, null, null, null, null),
  ('MemberCards', 'member_cards', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "text", "campo": "cardNumber", "indice": true, "colonna": "numero_tessera"}]', 74, true, 30, null, null, null, null, null),
  ('Invoices', 'invoices', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "text", "campo": "number", "colonna": "numero"}, {"tipo": "timestamptz", "campo": "date", "colonna": "data"}]', 75, true, 30, null, null, null, null, null),

  -- Le entita' con dentro i soci che Athlon non scarica
  ('MemberFiles', 'member_files', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "text", "campo": "name", "colonna": "nome"}, {"tipo": "text", "campo": "documentType", "colonna": "tipo_documento"}]', 76, true, 10, null, null, null, null, null),
  ('MemberPhotos', 'member_photos', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}]', 76, true, 30, null, null, null, null, null),
  ('MemberProductStateDeliveryChanges', 'member_product_state_delivery_changes', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "bigint", "campo": "memberProductId", "indice": true, "colonna": "member_product_id"}, {"tipo": "timestamptz", "campo": "date", "colonna": "data"}, {"tipo": "numeric", "campo": "quantity", "colonna": "quantita"}]', 76, true, 10, null, null, null, null, null),
  ('MemberPushNotifications', 'member_push_notifications', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}]', 76, true, 30, null, null, null, null, null),
  ('ActivityMemberSkills', 'activity_member_skills', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}]', 76, true, 60, null, null, null, null, null),
  ('OnlineGateTransactions', 'online_gate_transactions', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "numeric", "campo": "grossAmount", "colonna": "importo"}, {"tipo": "text", "campo": "status", "colonna": "stato"}, {"tipo": "text", "campo": "provider", "colonna": "provider"}, {"tipo": "timestamptz", "campo": "createdDate", "indice": true, "colonna": "creato_il"}]', 77, true, 5, null, null, null, null, null),
  ('CashlessDebitPosTransactions', 'cashless_debit_pos_transactions', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "numeric", "campo": "amountLeftToPay", "colonna": "da_pagare"}, {"tipo": "timestamptz", "campo": "date", "colonna": "data"}]', 77, true, 10, null, null, null, null, null),
  ('ClassRatings', 'class_ratings', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "bigint", "campo": "classId", "indice": true, "colonna": "class_id"}, {"tipo": "int", "campo": "rating", "colonna": "voto"}]', 77, true, 30, null, null, null, null, null),
  ('FacilityBookings', 'facility_bookings', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "bigint", "campo": "clubZoneId", "colonna": "club_zone_id"}]', 77, true, 5, null, null, null, null, null),
  ('DeferredRevenues', 'deferred_revenues', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "bigint", "campo": "contractId", "indice": true, "colonna": "contract_id"}]', 78, true, 30, null, null, null, null, null),
  ('DeferredRevenueSettlements', 'deferred_revenue_settlements', 'id', 'version', '[{"tipo": "bigint", "campo": "deferredRevenueId", "indice": true, "colonna": "deferred_revenue_id"}]', 78, true, 30, null, null, null, null, null),
  ('Companies', 'companies', 'id', 'version', '[{"tipo": "text", "campo": "name", "colonna": "nome"}, {"tipo": "text", "campo": "taxPayerIdentificationNumber", "indice": true, "colonna": "partita_iva"}]', 78, true, 60, null, null, null, null, null),
  ('CompanyInvoices', 'company_invoices', 'id', 'version', '[]', 78, true, 60, null, null, null, null, null),
  ('Crm2ConsultantAvailability', 'crm2_consultant_availability', 'id', 'version', '[{"tipo": "bigint", "campo": "consultantId", "indice": true, "colonna": "consulente_id"}, {"tipo": "timestamptz", "campo": "startDateUtc", "indice": true, "colonna": "inizio"}, {"tipo": "timestamptz", "campo": "endDateUtc", "colonna": "fine"}]', 79, true, 30, null, null, null, null, null),
  ('EmployeeAvailabilitySlots', 'employee_availability_slots', 'id', 'version', '[{"tipo": "bigint", "campo": "employeeId", "indice": true, "colonna": "employee_id"}]', 79, true, 30, null, null, null, null, null),

  -- Senza `version` (come Athlon)
  ('MemberCustomAttributes', 'member_custom_attributes', 'id', 'id', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "bigint", "campo": "attributeDefinitionId", "indice": true, "colonna": "definition_id"}, {"tipo": "text", "campo": "rawValue", "colonna": "valore"}]', 80, true, 60, 6, null, null, null, null),
  ('MemberAgreementAnswers', 'member_agreement_answers', 'id', 'id', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "bigint", "campo": "memberAgreementId", "colonna": "agreement_id"}, {"tipo": "boolean", "campo": "agreed", "colonna": "accettato"}, {"tipo": "timestamptz", "campo": "lastModificationDate", "colonna": "modificato_il"}]', 81, true, 60, 24, null, null, null, null),
  ('Crm2Leads', 'crm2_leads', 'id', 'id', '[{"tipo": "text", "campo": "email", "indice": true, "colonna": "email"}, {"tipo": "text", "campo": "status", "colonna": "stato"}, {"tipo": "bigint", "campo": "consultantId", "colonna": "consulente_id"}, {"tipo": "timestamptz", "campo": "creationDateTime", "colonna": "creato_il"}, {"tipo": "timestamptz", "campo": "conversionDate", "colonna": "convertito_il"}]', 82, true, 60, 6, null, null, null, null),
  ('Crm2Events', 'crm2_events', 'id', 'id', '[{"tipo": "bigint", "campo": "relatedToId", "indice": true, "colonna": "lead_id"}, {"tipo": "text", "campo": "eventType", "colonna": "tipo"}, {"tipo": "text", "campo": "eventOutcome", "colonna": "esito"}, {"tipo": "bigint", "campo": "consultantId", "colonna": "consulente_id"}, {"tipo": "timestamptz", "campo": "createdTime", "colonna": "creato_il"}, {"tipo": "timestamptz", "campo": "timeFrom", "colonna": "dalle"}]', 83, true, 60, 24, null, null, null, null),
  ('CrmLeads', 'crm_leads', 'id', 'id', '[{"tipo": "bigint", "campo": "memberId", "colonna": "member_id"}]', 84, true, 60, 24, null, null, null, null),
  ('PrepaidTransactions', 'prepaid_transactions', 'id', 'id', '[{"tipo": "bigint", "campo": "memberId", "colonna": "member_id"}]', 85, true, 60, 24, null, null, null, null),
  ('MemberLevels', 'member_levels', 'id', 'id', '[]', 86, true, 60, 1, 'Members', 'levels/any()', 'levels', 'I soci che hanno almeno un livello, ognuno con i suoi livelli. Una riga per socio: dati.levels e'' l''elenco.'),
  -- Senza `version`, che Athlon non scarica
  ('ContractDiscountAssignments', 'contract_discount_assignments', 'id', 'id', '[{"tipo": "bigint", "campo": "contractId", "indice": true, "colonna": "contract_id"}, {"tipo": "bigint", "campo": "contractDiscountDefinitionId", "colonna": "discount_definition_id"}]', 87, true, 30, 24, null, null, null, null),
  ('InvoiceItems', 'invoice_items', 'id', 'id', '[{"tipo": "bigint", "campo": "invoiceId", "indice": true, "colonna": "invoice_id"}, {"tipo": "text", "campo": "name", "colonna": "nome"}, {"tipo": "numeric", "campo": "quantity", "colonna": "quantita"}]', 87, true, 30, 24, null, null, null, null),
  ('CompanyInvoiceItems', 'company_invoice_items', 'id', 'id', '[]', 87, true, 60, 24, null, null, null, null),
  ('WarehouseChanges', 'warehouse_changes', 'id', 'id', '[{"tipo": "bigint", "campo": "productId", "colonna": "product_id"}]', 87, true, 60, 24, null, null, null, null),

  -- Le due grandi: prenotazioni delle lezioni e accessi al club
  ('ClassBookings', 'class_bookings', 'id', 'version', '[{"tipo": "bigint", "campo": "classId", "indice": true, "colonna": "class_id"}, {"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "boolean", "campo": "isCanceled", "colonna": "annullata"}, {"tipo": "boolean", "campo": "isStandby", "colonna": "in_attesa"}, {"tipo": "boolean", "campo": "hasAttended", "colonna": "presente"}, {"tipo": "bigint", "campo": "groupEnrollmentId", "colonna": "group_enrollment_id"}]', 90, true, 5, null, null, null, null, null),
  ('MemberClubVisits', 'member_club_visits', 'id', 'version', '[{"tipo": "bigint", "campo": "memberId", "indice": true, "colonna": "member_id"}, {"tipo": "timestamptz", "campo": "enterDate", "indice": true, "colonna": "entrata"}, {"tipo": "timestamptz", "campo": "leaveDate", "colonna": "uscita"}, {"tipo": "text", "campo": "readerName", "colonna": "lettore"}]', 91, true, 5, null, null, null, null, null)
on conflict (nome) do nothing;

select perfectgym.crea_tabella(nome) from perfectgym.entita;

-- Un socio, un livello per riga.
create or replace view perfectgym.livelli_dei_soci as
select s.id as member_id,
       (l ->> 'id')::bigint as livello_id,
       l ->> 'name' as nome,
       (l ->> 'order')::int as ordine,
       (l ->> 'activityCategoryId')::bigint as activity_category_id,
       coalesce((l ->> 'isDeleted')::boolean, false) as livello_cancellato
  from perfectgym.member_levels s
 cross join lateral jsonb_array_elements(coalesce(s.dati -> 'levels', '[]'::jsonb)) l;

comment on view perfectgym.livelli_dei_soci is
  'La relazione socio-livello di PerfectGym, dall''elenco levels di ogni socio (MemberLevels).';
