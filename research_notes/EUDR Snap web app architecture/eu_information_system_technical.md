# EUDR Information System (TRACES): technical interface, as of 21 November 2026

Scope: inputs, outputs and integration paths that EUDR-Snap (a free web app for Colombian coffee and cocoa cooperatives) needs in order to produce files an EU operator can upload, or to submit by API on its behalf. Primary sources are the Commission's live Operator API Reference (HTML help at eudr.webcloud.ec.europa.eu, PDF "EUDR Operator API Reference v1.3") and Implementing Regulation (EU) 2026/1565. Items marked **verify** were not confirmed in a primary source.

## 1. GeoJSON specification for EUDR

### Takeaway
The Commission's spec is a standard RFC 7946-style FeatureCollection in WGS84 (lon, lat). It accepts Point, MultiPoint, Polygon and MultiPolygon. Every property is optional at "Type I" (producer level), and property names are case-sensitive: ProductionPlace, ProducerName, ProducerCountry, Area. Geolocation for a whole DDS is capped at 25 MB. Coordinates are truncated to 6 decimals on storage. Polygons must be closed, with no holes and no self-intersection. A point with no Area defaults to 4 ha.

### Cited Findings
- **Document and version.** The authoritative spec is the "GeoJSON File Description" page of the EUDR Operator API Reference, last updated 17 August 2026. It is bundled in the PDF "EUDR Operator API Reference v1.3". The page itself carries no separate GeoJSON version number. — [GeoJSON description (production help)](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html); same content on [acceptance](https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html)
- **Older standalone PDFs.** "EUDR GeoJSON File Description 1.5" (May 2025) and "Geolocation file description 1.0" (2024) are mirrored by national authorities. In v1.0, ProducerName/ProducerCountry appeared per feature only in Type II files. — [NLI.cz mirror of v1.5](https://nli.gov.cz/wp-content/uploads/EUDR-EUDR-GEOJSON-FILE-DESCRIPTION-1.5_.pdf); [v1.0 mirror](https://adr-docs.karlerss.com/KUAeJL5hH95l2e7xZLjlH58KjgRk3qw4/EUDR%20-%20Gelocation%20file%20description%201.0.pdf); [CIRCABC download](https://circabc.europa.eu/rest/download/adebc1da-4e60-4479-83dd-ee344607c6f9)
- **CRS.** WGS 84 (EPSG:4326), decimal degrees. Position order is longitude, latitude. Valid ranges are ±180 (lon) and ±90 (lat). The page says the first production version supports only this standard and that other coordinate systems are deferred. — [GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html)
- **Precision.**
  - The system truncates coordinates to 6 decimal places before storing them. — [GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html); [Validation rules](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/validation-rules.html)
  - The FAQ says coordinates need "at least 6 decimal digits". — [FAQ](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/faq.html)
  - The SD API says GeoJSON geometry needs a minimum of 6 decimal digits. — [SD V4 reference](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/api/simplified-declaration-v4.html)
  - A third-party guide claims TRACES rejects fewer than 6 decimals. — [Duracert](https://duracert.com/en/eudr-geojson-format)
- **Accepted geometry types.**
  - Point (two coordinate values).
  - MultiPoint (two or more points).
  - Polygon (at least 4 coordinate pairs, first equal to last).
  - MultiPolygon (two or more polygons).
  - LineString and MultiLineString are explicitly not accepted.
  - GeometryCollection is described, but acceptance is not explicitly confirmed (**verify**).
  - Inconsistency: the page's Point Feature example nests coordinates as `[[lon, lat]]`, while the text says two values (**verify** against acceptance).

  — [GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html)
- **Polygon validity rules.** Polygons must be closed. Holes ("doughnut" shapes) are not allowed; the workaround is two half-doughnut polygons. Also not allowed: crossing lines (figure-eight), overlapping sides or inward-folding concave overlaps, and degenerate straight-line shapes. Vertices that collapse to identical coordinates after 6-decimal rounding create duplicates and should be avoided. — [GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html)
- **Properties.** Names are case-sensitive, so `productionplace` is invalid. Unknown properties are ignored if syntactically valid. — [GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html)
  - `ProductionPlace`: optional, recommended. Name of the production place.
  - `ProducerName`: optional.
  - `ProducerCountry`: ISO 3166-1 alpha-2. Optional in Type I, required per Feature in Type II.
  - `Area`: hectares, must be a JSON number. A quoted value such as `"3"` is read as 0. Area applies to Point geometries.
- **Area and the 4 ha rule.**
  - If Area is omitted on a Point, the system defaults it to 4 ha.
  - Minimum Area is 0.0001 ha.
  - An Area above 4 ha on a point is an error unless the commodity is cattle. — [Validation rules](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/validation-rules.html)
  - Polygons are required for plots over 4 ha, except cattle. — [FAQ](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/faq.html)
  - The Commission recommends single points for plots under 4 ha to reduce file size. — [GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html)
- **File variants.** The structure is the same for both. — [GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html)
  - **Type I** is used for API and UI import at producer level.
  - **Type II** is UI import at commodity level. It holds multiple producers grouped by ProducerName + ProducerCountry, with ProducerCountry on every Feature, and may use MultiPoint/MultiPolygon.
  - The official examples use features such as `{"ProductionPlace":"FAZENDA TABOAO II","Area":2.39,"ProducerCountry":"BR"}`.
- **Rejected inputs.** Syntax errors, wrong file format (PDF, TXT), password-protected files and invalid ISO2 codes are all rejected. — [GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html)
- **Size and count limits.** All limits below are from [Validation rules](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/validation-rules.html).

  | Limit | Value |
  |---|---|
  | Geolocation data per DDS (total of all GeoJSON) | 25 MB |
  | Commodities per DDS | 200 |
  | Producers per commodity | 1,000 |
  | Producers per DDS | 10,000 |
  | Referenced DDS per DDS | 2,000 |
  | UI drafts per operator | 50 |

  No explicit maximum count of features or vertices is published. The 25 MB limit is also stated on the [GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html) page.
- **Legal basis for limits.** Under Implementing Reg. 2026/1565 (Art. 15(4) of 2024/3084 as amended), the Commission may set file size limits, rules on interaction frequency and measures against incorrect or duplicate data, and must inform users without delay. — [EUR-Lex 2026/1565](https://eur-lex.europa.eu/eli/reg_impl/2026/1565/oj/eng)

### Inferences
- For EUDR-Snap, export a Type I FeatureCollection per producer (or per cooperative lot) with these rules:
  - `ProducerCountry: "CO"`.
  - `ProductionPlace` set to the farm or vereda name.
  - `ProducerName` set to the farmer.
  - `Area` as a number, in ha.
  - Points for farms of 4 ha or less, polygons for larger ones.
  - Coordinates rounded or truncated to exactly 6 decimals, then deduplicated and re-checked for validity after rounding.
- Most Colombian coffee smallholdings are small, so points make 25 MB a non-issue for typical lots. The binding constraint is 1,000 producers per commodity line and 10,000 per DDS. Large cooperatives need to split lots or use grouping (see section 2).
- Pre-validate client-side before export:
  - closure and ring orientation;
  - self-intersection (e.g. turf.js `kinks`);
  - no holes;
  - Area is numeric;
  - property names are exact-case;
  - lon/lat order (a common mistake is lat/lon).

### Gaps
- No official machine-readable JSON Schema for EUDR GeoJSON was found.
- Whether GeometryCollection is accepted, and the exact Point nesting, are unconfirmed (**verify** in ACCEPTANCE).
- Whether the "Type II" commodity-level import also applies to the SD flow is undocumented.

## 2. DDS submission: web UI, API, environments, authentication, operations, reference numbers

### Takeaway
The integration path is a SOAP/WS-Security web service. There is no REST API. The current operator version is **V4**, with V3 available during a transition and V1/V2 deprecated. It runs on production `https://eudr.webcloud.ec.europa.eu/tracesnt/` and ACCEPTANCE `https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/`. The DDS operations are submitDds, amendDds, withdrawDds, getDds and getDdsByInternalReference. Amend and withdraw are allowed only within 72 hours. V4 removed retrieval of statement detail, including by reference + verification number, from the API: it is UI-only, for non-SME downstream operators and traders. The reference number is at most 14 characters (observed pattern YY + ISO2 + 10 alphanumerics). The verification number is 5–35 characters (observed as 8).

### Cited Findings
- **Protocol and versions.** All version details are from the [Operator API Reference index](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/index.html).
  - The protocol is SOAP.
  - V1 covered DDS submit and retrieve. V2 added retrieval operations.
  - V3 was a redesign covering DDS, Simplified Declaration (SD) and grouped declarations, and introduced the 2025/2650 information exchange.
  - **V4 is current for operators.** It "removes statement detail retrieval over the API (detail is UI-only)".
  - The competent authority service `EUDR4Authorities` stays at V3.
  - V1 and V2 were to be decommissioned "with the release of V3". The [change log](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/change-log.html) says V3 "remains available during the transition period" and gives no end date (**verify** the V3 sunset date).
- **Earlier V3 documentation.** "Documentation version 1.0, API specification V3", dated 2026-05-29 per a search snippet, explicitly covers the 2025/2650 information exchange. — [EUDR Operator API Reference v1.0 PDF](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/pdf/EUDR%20Operator%20API%20Reference%20v1.0.pdf). The current HTML references PDF v1.3. — [index](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/index.html)
- **WSDLs (V4).** All paths are appended to the base URLs and listed on the [index](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/index.html).

  | Service | Path |
  |---|---|
  | DDS | `/ws/EUDRDueDiligenceStatementServiceV4?wsdl` |
  | SD | `/ws/EUDRSimplifiedDeclarationServiceV4?wsdl` |
  | Connectivity test | `/ws/EudrEchoService?wsdl` |

  XSDs are retrieved by replacing `?wsdl` with `?xsd=1`, `?xsd=2`, and so on. The body namespace is `http://ec.europa.eu/tracesnt/body/v4`.
- **Authentication.** — [index](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/index.html)
  - WS-Security over HTTPS, using a `UsernameToken` with `PasswordDigest`, a Nonce and a Timestamp (`wsu:Created`/`wsu:Expires`).
  - A `WebServiceClientId` header is required, shown in the "Web Services Access" section of the user profile.
  - Multi-operator requests use a `BodyIdentity` header with `OperatorAccessIdentifier`.
  - The client ID values `eudr-test` (ACCEPTANCE) and `eudr-repository` (production) appear in a third-party client, but that README is internally inconsistent (it also lists `eudr`). — [eudr-api-client README](https://app.unpkg.com/eudr-api-client@1.0.21/files/README.md). **Verify.**
- **Getting credentials.** — [Acquiring credentials](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/acquiring-credentials.html)
  1. Create or join an operator in the Information System via EU Login.
  2. Have at least one real (non-anonymous) reference user. That user becomes the administrator and "responsible person".
  3. Under Edit Profile, read the "username".
  4. Under "Web Services Access", click "Active" to generate the **Authentication Key**, which is private.
  5. Test in ACCEPTANCE first, then repeat the setup in production.

  An older 2024 deck and search snippets say API access requests go by email to SANTE-TRACES@ec.europa.eu with subject "EUDR API...". The current page describes self-service key activation. — [search snippet / CIRCABC](https://circabc.europa.eu/rest/download/e39c12d9-9f95-45b7-8b74-c7bd3d0ae49c). **Verify** whether an email request is still needed.
- **Common authentication failure.** A bare `InternalSystemException` SOAP fault is usually caused by line-wrapped Base64 in the PasswordDigest or Nonce (encoders that wrap at 76 characters), or by pretty-printing the Security header. — [Troubleshooting](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/troubleshooting.html)
- **DDS V4 operations.** — [DDS V4 reference](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/api/due-diligence-statement-v4.html)

  | Operation | What it does | Returns |
  |---|---|---|
  | `submitDds` | Submits a new DDS. Optional `groupedDeclarations`. Roles: OPERATOR or REPRESENTATIVE_OPERATOR. | UUID |
  | `amendDds` | Amends within **72 hours**, same reference number, risk profiling re-run. | uuid, status |
  | `withdrawDds` | Withdraws within 72 hours. Blocked if GROUPED or under an active competent authority check. | uuid, status |
  | `getDds` | Overview by UUID: status, reference number, verification number. | overview |
  | `getDdsByInternalReference` | Same overview, looked up by internal reference. | overview |

  - `getDdsByIdentifiers` (lookup by reference + verification number) is discontinued in the API and is UI-only for the non-SME Downstream Operator/Trader role.
  - Errors: `BusinessRulesValidationException`, `PermissionDeniedException`, `NotFoundException`, `EUDR_API_AMEND_DEADLINE_ELAPSED`, `EUDR-GROUPING-NOT-ALLOWED-ON-AMEND`.
- **DDS V4 request model.** — [DDS V4 reference](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/api/due-diligence-statement-v4.html)
  - Top level: `operatorRole` plus `statement`.
  - `statement` fields:
    - `internalReferenceNumber`
    - `activityType` (DOMESTIC/IMPORT/EXPORT)
    - `representedOperator`, required when acting as REPRESENTATIVE_OPERATOR
    - `countryOfActivity`, `borderCrossCountry`, `comment`
    - `commodities`
    - `geoLocationConfidential` (required)
    - `groupedDeclarations`
  - Commodity:
    - `position`
    - `descriptors.descriptionOfGoods`, max 150 characters
    - `goodsMeasure`: `netWeight` in kg, `supplementaryUnit` and qualifier, `percentageEstimationOrDeviation`
    - `hsHeading`, 2–10 digits
    - `speciesInfo`
    - `producers`
  - Producer:
    - `position`
    - `country`, ISO2, required
    - `name`, max 500 characters
    - `geometryGeojson`, the **base64-encoded GeoJSON**
    - `geometryData`
  - Operator identifier types: `eori`, `vat`, `gln`, `tin`, `cbr`, `cin`, `duns`, `comp_num`, `comp_reg`, `oni`, with values up to 80 characters.
- **Status values.** SUBMITTED, AVAILABLE, REJECTED, WITHDRAWN, CANCELLED, ARCHIVED, GROUPED, OBSOLETE. SUSPENDED and UPDATED are not yet active. — [DDS V4 reference](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/api/due-diligence-statement-v4.html)
- **Validation business rules.** — [Validation rules](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/validation-rules.html)
  - The activity type cannot change on amend.
  - Non-EU operators may only use IMPORT.
  - IMPORT/EXPORT requires an EORI and a positive net mass per commodity.
  - A referenced DDS must be AVAILABLE or ARCHIVED, and a DDS cannot reference itself.
  - A DDS that other DDS reference cannot be amended or withdrawn.
  - After the amendment delay, only the competent authority can extend it.
- **Reference and verification numbers.**
  - Reference number: max 14 characters. Verification number: 5–35 characters. — [DDS V4 reference](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/api/due-diligence-statement-v4.html)
  - SD references are 14 characters starting with `S` (introduced in V3). — [Change log](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/change-log.html)
  - Real-looking examples from a third-party client: reference `25NLSN6LX69730` with verification `K7R8LA90`. Its validators assume a reference of 8–15 uppercase alphanumerics and a verification number of exactly 8 characters. — [eudr-api-client README](https://app.unpkg.com/eudr-api-client@1.0.21/files/README.md). **Verify.**
  - Both numbers are assigned by the system (Art. 7 of 2024/3084 as amended). Competent authorities can delay releasing them during checks (Art. 7(3)). — [EUR-Lex 2026/1565](https://eur-lex.europa.eu/eli/reg_impl/2026/1565/oj/eng)
- **Downstream referencing and grouping.** — [EUR-Lex 2026/1565](https://eur-lex.europa.eu/eli/reg_impl/2026/1565/oj/eng)
  - Under Art. 8a, a new DDS/SD can reference earlier ones by reference number or declaration identifier. The referenced items become "GROUPED", and the grouped item substitutes for them under EUDR Arts 4(7) and 26(4).
  - Recital 7 ties grouping to file-size limits and avoiding customs disruption.
  - A grouped DDS inherits geolocation from the declarations it references. — [FAQ](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/faq.html)
- **Environments.** — [Green Forum: Information System page](https://green-forum.ec.europa.eu/nature-and-biodiversity/deforestation-regulation-implementation/information-system-deforestation-regulation_en)
  - PRODUCTION submissions "have legal value".
  - ACCEPTANCE submissions "do not have legal value" and are for training and testing.
  - Registration is separate per environment.
  - Release notes and the user guide are on CIRCABC. Support is sante-traces@ec.europa.eu.
  - Training sessions ran on 3, 10, 17 and 24 November 2026 (DDS) and 27 October and 12, 19 and 26 November 2026 (SD).
- **Simplified Declaration (SD) V4 API.** This is relevant if a Colombian cooperative member is an "MSPO"; the cooperatives here are non-EU, so check applicability in the legal notes. — [SD V4 reference](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/api/simplified-declaration-v4.html)
  - Operations: `submitSd`, `updateSd`, `withdrawSd`, `getSd`, `getSdByInternalReference`. `getSdByIdentifiers` is UI-only.
  - Roles: `MICRO_OPERATOR`, `REPRESENTATIVE_MSPO`, `MEMBER_STATE`.
  - Each producer location takes **one of**: a base64 GeoJSON, a postal address (street, postal code and city all required; `producerStreet` became mandatory in V4), or a cadastral identifier (max 80 characters).
  - The SD stays valid indefinitely unless major changes occur.
  - The V4 change log adds `internalReferenceNumber` up to 50 characters and `EudrUserMessage` up to 2,000 characters. — [Change log](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/change-log.html)
- **Web UI fields.** No current UI field list was retrieved. The UI captures the same data model as the API (activity, operator, commodities with HS code, description, net mass, producers with country and name, and GeoJSON upload or Type II commodity import). — [GeoJSON description](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html). Older UI guide mirror: [WKO 2a EUDR information system](https://wko.at/ktn/handel/2a-eudr-information-system.pdf). **Verify** with the current CIRCABC user guide.

### Inferences
- **Most practical MVP path.** EUDR-Snap produces:
  1. a validated Type I or Type II GeoJSON file the importer uploads in the TRACES UI;
  2. a structured data sheet (HS heading, e.g. 0901 coffee or 1801 cocoa beans; description; net mass in kg; producer list with ISO2 country and name) that maps 1:1 onto `DdsCommodityType` and `DdsProducerType`.

  This keeps EUDR-Snap out of the credential and liability chain.
- **Later API path.** Build a SOAP client from the V4 WSDL (zeep, CXF or node-soap), test in ACCEPTANCE with the Echo service, then call `submitDds` with `geometryGeojson` base64-encoded.
  - V4 drops retrieval by reference + verification number, so an importer cannot pull upstream DDS content via the API.
  - The design should therefore carry reference and verification numbers as plain data passed downstream, and use them in `groupedDeclarations`.
- The 72-hour amend window means the app should encourage validation before submission. After 72 hours, any fix requires a new DDS.

### Gaps
- The exact sunset date for V3 was not found.
- The exact reference number format specification was not found. The YY+ISO2+10 pattern is inferred from examples only.
- Rate limits, timeouts and call quotas are undocumented. Art. 15(4) allows the Commission to set them.
- No current UI user guide (2026 edition) was retrieved.

## 3. Third parties, authorised representatives and delegation

### Takeaway
The system supports acting on behalf of others in two ways:
- **Authorised representative (legal role).** An **EU-established** person holding a written mandate from the operator. In the API this is `operatorRole = REPRESENTATIVE_OPERATOR` with `representedOperator` filled in, or `REPRESENTATIVE_MSPO` for SDs.
- **Technical multi-operator access.** A service provider can use `BodyIdentity`/`OperatorAccessIdentifier` to act for several operators.

A Colombian cooperative or a non-EU software provider therefore cannot be the legal authorised representative. It can, however, prepare data, and possibly operate API calls with the operator's access identifier (**verify** the exact delegation workflow).

### Cited Findings
- The FAQ defines an authorised representative as an EU-established person with a written mandate from an operator to act for it on specified tasks. — [FAQ](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/faq.html)
- In DDS V4, `submitDds` accepts roles OPERATOR or REPRESENTATIVE_OPERATOR, and `representedOperator` is required for REPRESENTATIVE_OPERATOR. — [DDS V4 reference](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/api/due-diligence-statement-v4.html)
- An authorised representative must fill in the represented operator or trader's name, address and at least one identifier, and the EORI must be valid. A web-service user cannot belong to more than one operator. — [Validation rules](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/validation-rules.html)
- Multi-operator requests use the `BodyIdentity` header with `OperatorAccessIdentifier`. — [index](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/index.html). A search snippet adds that only OperatorAccessIdentifier is accepted for EUDR endpoints. — [search result referencing the operator docs](https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/index.html). **Verify.**
- Under 2026/1565 (Art. 2(2) and Art. 8a(1)), authorised representatives are Information System users. They may act for operators and may group statements for the same operator or MSPO. — [EUR-Lex 2026/1565](https://eur-lex.europa.eu/eli/reg_impl/2026/1565/oj/eng)
- A secondary source describes the setup this way: the representative registers under the role "EUDR Authorised Representative" and is linked to the operator's account, and the written mandate must be available for inspection by competent authorities. — [TraceX (vendor)](https://tracextech.com/eu-based-representative-eudr-compliance/)
- Public institutions and private companies developing software for economic operators are an intended audience of the API documentation. — [Acquiring credentials](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/acquiring-credentials.html)

### Inferences
- EUDR-Snap, as a non-EU, free tool, should position itself as a **data preparer**. The operator (the EU importer) or its EU-based representative files the DDS.
- Submitting by API "on behalf of" an operator would mean either the importer gives EUDR-Snap its own web-service credentials (a username plus a private authentication key, which the docs say to use only with "your application"), or EUDR-Snap obtains an EU entity that acts as authorised representative.
- Both options raise liability and credential-custody questions, so this is not recommended for the MVP.

### Gaps
- The exact UI steps for linking a representative, and for granting an `OperatorAccessIdentifier` to a third-party service provider, were not retrieved. The TRACES help page returned 404.

## 4. Registration: EORI and non-EU entities

### Takeaway
Registration goes through EU Login, with one single account per user that can hold multiple roles. Non-EU operators can register, but they are validated only if they request the "EUDR operator" role and provide an EORI issued by an EU Member State or UK (Northern Ireland) authority. They can only declare IMPORT. A Colombian cooperative without an EU EORI therefore cannot file DDSs itself.

### Cited Findings
- Under 2026/1565, users register individually through EU Login with a unique identifier (Art. 3(c)). "Information System users shall create one single account", with several roles possible (Art. 10(1)). Competent authorities can suspend or revoke access. — [EUR-Lex 2026/1565](https://eur-lex.europa.eu/eli/reg_impl/2026/1565/oj/eng)
- Official TRACES help (from a search snippet; the page now returns 404) says a non-EU operator is validated only if it requested the "EUDR operator" role and inserted an EORI issued by a Member State or UK(NI) authority. — [TRACES help: create an account](https://webgate.ec.europa.eu/IMSOC/tracesnt-help/Content/en/documents-certificates/eudr/create-an-account-in-eudr-platform.html). **Verify**: the page is offline.
- Non-EU operators may only use activity IMPORT, and IMPORT/EXPORT requires an EORI. — [Validation rules](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/validation-rules.html)
- A vendor Q&A first says only non-EU companies with an XI EORI can file, then that EORIs from any Member State work. The official rule (any Member State or XI) is the more reliable one. — [Interu Q&A](https://www.interu.io/blog/eudr-traces-nt-updates-whats-changed-and-what-it-means-for-you---q-a)
- National registration guides: [Skogsstyrelsen manual (SE)](https://skogsstyrelsen.se/globalassets/lag-och-tillsyn/avskogningsforordningen/forklaring-om-tillborlig-aktsamhet/manual-registrering-i-traces.pdf); [Miljødirektoratet (NO)](https://www.miljodirektoratet.no/ansvarsomrader/arter-naturtyper/avskogingsforordningen/slik-etterlever-din-bedrift-eus-avskogingsforordning/opprette-bruker-og-registrere-bedriften/); [Assolombarda user guide (IT)](https://assolombarda.it/servizi/ambiente/documenti/sistema-informativo-eudr-guida-per-lutente)

### Inferences
- Colombian cooperatives can create EU Login accounts, and could in principle register as a trader-type user to receive or keep references.
- They cannot be the filing operator unless they hold an EU EORI and import into the EU themselves. EUDR-Snap's primary user of the Information System is the EU importer.

### Gaps
- Whether non-EU entities can hold any role without an EORI, for example for viewing, was not confirmed.
- Validation turnaround times are unknown.

## 5. Known limits, issues (2025–2026), and changes from 2025/2650 and 2026/1565

### Takeaway
In 2025, capacity concerns about the IT system drove the Commission's second delay proposal. Regulation 2025/2650 moved application to 30 December 2026, and access to the system was temporarily limited from February 2026. The system reopened around end of June 2026. Implementing Regulation 2026/1565 (adopted 13 July 2026) then brought in:
- simplified declarations for micro and small primary operators;
- grouping of declarations;
- automated risk profiling;
- 60-minute contingency arrangements;
- Commission power to set file and interaction limits.

API V3 and V4 implement these. No credible reports of 2026 upload or performance incidents were found.

### Cited Findings
- **2025 capacity concerns.** In September 2025, IT problems led the Commission to propose another delay. Commissioner Roswall cited the volume of information entering the system. — [Just Food](https://www.just-food.com/newsletters/eu-seeks-fresh-delay-to-deforestation-rules-amid-it-headaches); [FoodNavigator, "Inside the EUDR IT system" (Oct 2025)](https://www.foodnavigator.com/Article/2025/10/21/eudr-inside-the-it-system/)
- **2024 bug reports.** Functional bugs were reported in the system in May 2024. — [FeedNavigator](https://feednavigator.com/Article/2024/05/27/Warning-about-EUDR-information-system-functionality-bugs)
- **2025/2650.** Application moved to 30 December 2026, the operator definition was revised, and micro or small primary operators file a one-time simplified declaration and receive a declaration identifier. — [EY tax news, 20 Jan 2026](https://taxnews.ey.com/news/2026-0237-eu-deforestation-regulation-application-postponed-to-30-december-2026); [EUR-Lex 2025/2650](https://eur-lex.europa.eu/eli/reg/2025/2650/oj)
- **Reopening.** The Information System reopened at the end of June 2026. — [Baker McKenzie, 16 Jul 2026](https://supplychaincompliance.bakermckenzie.com/2026/07/16/blog-post-eudr-european-commission-finalizes-the-eudr-product-scope-and-information-system-ahead-of-december-2026-application/). An earlier Commission notice announced temporary access limitations from February. — [search snippet, Green Forum](https://green-forum.ec.europa.eu/nature-and-biodiversity/deforestation-regulation-implementation/information-system-deforestation-regulation_en). **Verify** the exact dates.
- **2026/1565.** — [EUR-Lex 2026/1565](https://eur-lex.europa.eu/eli/reg_impl/2026/1565/oj/eng); [Commission news 13 Jul 2026](https://environment.ec.europa.eu/news/commission-updates-product-scope-and-tools-support-eudr-2026-07-13_en); [CMS](https://cms.law/en/deu/legal-updates/eudr-nearing-completion-commission-adopts-final-legal-acts-on-product-scope-and-information-system)
  - Adopted 13 July 2026, published in the OJ on 14 July 2026, and in force from the third day after publication. The change on attributing statements to competent authorities applies from 15 October 2026.
  - New SD Art. 4a: updates keep the same identifier and re-trigger risk profiling. Withdrawal is possible until the SD is used in a grouping.
  - Grouping Art. 8a.
  - Automated risk profiling Art. 6: the risk status is hidden from users.
  - Contingency Art. 15a: for unplanned unavailability over 60 minutes, a contingency reference number and contingency declaration identifier are used. The Commission must publish contingency information by 30 December 2026.
  - Retention Art. 12(5): personal data is kept up to 5 years.
  - Recital 6 deletes the reference to TRACES infrastructure, so hosting may move.
- **Contingency reference numbers.** A competent or customs authority generates a contingency reference number when the system is down for more than 60 minutes. It must later be replaced by a system-generated number. — [FAQ](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/faq.html)
- **Planned downtime.** Finnish Customs lists planned downtime on Saturday 21 November (2026) from 7:00 to 15:15. — [Tulli](https://tulli.fi/en/-/eu-deforestation-regulation-eudr-requires-measures-by-importers-and-exporters-consider-these-things-in-your-customs-declarations). **Verify** whether this concerns the EUDR IS or the Finnish customs system.
- **Common GeoJSON rejection causes (vendor list).** Unclosed polygons, syntax errors, wrong property casing, and numbers stored as strings. — [TraceX: common GeoJSON errors](https://tracextech.com/geojson-file-errors/). This is consistent with the official rules in section 1.

### Inferences
- Design for the 25 MB, 1,000-producer-per-commodity and 10,000-producer-per-DDS caps. Use points under 4 ha, and split large lots into multiple DDS or SD records linked by grouping.
- Expect the hosting domain to possibly change, since the TRACES reference was removed. Keep endpoints configurable.

### Gaps
- No credible 2026 user reports on performance or upload errors after the reopening were found.
- The CIRCABC release notes were not retrieved.

## 6. Customs integration

### Takeaway
In the EU customs declaration, the DDS reference number is entered with TARIC condition/document code **C716**. A DDS from earlier in the chain uses **C717**. Exemption codes are Y129, Y132, Y133, Y141 and Y142. Several DDS can go on one customs declaration, and one DDS can cover several. Customs systems cross-check references against the EUDR IS, with full automated checking targeted by 30 June 2028. No primary source naming the EU Customs Single Window (CERTEX) interface for EUDR was found.

### Cited Findings
- **Condition codes.** All from [Finnish Customs (Tulli)](https://tulli.fi/en/-/eu-deforestation-regulation-eudr-requires-measures-by-importers-and-exporters-consider-these-things-in-your-customs-declarations).

  | Code | Meaning |
  |---|---|
  | C716 | DDS to be presented upon import/export; enter the DDS reference number |
  | C717 | Reference number of a previous DDS (Art. 4(8)) |
  | Y129 | Goods not covered by the Regulation |
  | Y132 | Products manufactured before 29 June 2023 |
  | Y133 | End-of-life material |
  | Y141 | Micro/small transition exception |
  | Y142 | Non-commercial activity |

  - Multiple DDS can go on one declaration, and one DDS can cover several declarations.
  - Warehousing, inward processing and transit are possible without a DDS until release into free circulation.
  - Automatic checking of DDS reference numbers is intended by 30 June 2028.
- **TARIC data.** A Commission TARIC data note on the EUDR codes (Croatian mirror) confirms the Y142 definition. — [Carina.gov.hr TARIC data PDF](https://carina.gov.hr/UserDocsImages/dokumenti/CTVP/Deforestation%20Reg%202023%201115%20-%20TARIC%20data.pdf)
- **SD identifier at customs.** The SD declaration identifier travels with products in place of a DDS reference number and must be available to customs before release or export. — [FAQ](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/faq.html)
- **Customs in the legal text.** Implementing Reg. 2026/1565 lists customs authorities as Information System actors and users but does not name the EU Customs Single Window. — [EUR-Lex 2026/1565](https://eur-lex.europa.eu/eli/reg_impl/2026/1565/oj/eng)

### Inferences
- EUDR-Snap's export should carry the DDS reference number and verification number, plus any SD identifiers, as first-class fields. That way importers and their customs brokers can fill in C716 or C717 without retyping.

### Gaps
- No source found on how the verification number is used in customs declarations, if at all.
- No source found on whether a contingency reference number is entered under C716.
- No source found on the code to use for SD identifiers.
- No source found on the CERTEX / EU CSW technical flow.

## 7. Open-source libraries, validators and test files

### Takeaway
A few open-source clients and validators exist. None is official, and several target the deprecated V1/V2 API:
- `thorgate/py-eudr` (Python/zeep, work in progress, last push April 2025);
- `mfrntic/eudr-api-client` (Node, AGPL-3.0, V1/V2);
- `4bdullatif/eudr-php-client` (PHP);
- `julio-collazos/EudrGisAuditor` (GeoJSON audit and cleaning, Docker);
- GeoRoots Editor (EFI, open-source browser editor);
- a GS1 EUDR demo tool.

The best "test files" are the official Type I and Type II examples, the V4 sample XMLs in the docs, and the ACCEPTANCE environment.

### Cited Findings
- **py-eudr (Python).** Built on zeep, with echo, `--submit-random` and `--retract` options. Work in progress, last pushed April 2025. — [awesome.ecosyste.ms: thorgate/py-eudr](https://awesome.ecosyste.ms/projects/github.com%2Fthorgate%2Fpy-eudr)
- **eudr-api-client (Node).**
  - Covers submitDds, amendDds and retractDds, plus retrieval including `getStatementByIdentifiers` and `getReferencedDds`.
  - Has a base64 `encodeGeojson` helper.
  - Dual license: AGPL v3 or commercial.
  - Targets V1/V2 services (`EUDRSubmissionServiceV2`, `EUDRRetrievalServiceV1`), which are now superseded by V4.

  — [README v1.0.21](https://app.unpkg.com/eudr-api-client@1.0.21/files/README.md); repo https://github.com/mfrntic/eudr-api-client
- **eudr-php-client (PHP).** Wraps the TracesNT SOAP API with WS-Security, covering submit, amend, retract and retrieve. — [Packagist](https://packagist.org/packages/4bdullatif/eudr-php-client); [DEV post](https://dev.to/4bdullatif_1/i-built-a-modern-php-client-for-the-eu-deforestation-regulation-api-4577)
- **Java.** A raw SOAP example for DDS submission, with a recommendation to generate proxies from the WSDL. — [tanso.de blog](https://www.tanso.de/blog/eudr-traces-api-erp-integration-erfolgreich-umsetzen-herausforderungen-und-alternativen)
- **EUDR GIS Auditor.** Validates, audits and cleans EUDR geodata, and runs via Docker Compose. License not confirmed. — [project page](https://julio-collazos.github.io/geo-consultant/projects/eudr-gis-auditor)
- **GeoRoots Editor (EFI).** An open-source in-browser editor that exports EUDR-aligned GeoJSON. — [EFI news, Feb 2026](https://efi.int/news/georoots-editor-accessible-secure-and-eudr-ready-geodata-editing-directly-your-browser-2026-02); [EFI GeoRoots](https://efi.int/article/georoots)
- **GS1 EUDR artefacts and demo tool.** — [GS1 ref](https://ref.gs1.org/standards/eudr/artefacts)
- **Official samples.** DDS and SD sample XMLs (V3, V4) are linked from the docs: `samples/v4/dds-samples.html` and `samples/v4/sd-samples.html` under the operator docs root. — [index](https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/index.html)
- **Conformance test documents.** The older v0.1 documents (May 2024) are outdated. — [WKO test1 v0.1](https://wko.at/ktn/handel/eudr--api-eo-cf-test1-v0.1.pdf)
- **Geolocation guidance.** EFI geolocation guidance for cocoa (2026). — [EFI Geolocation FactSheet 2026](https://efi.int/sites/default/files/files/flegtredd/Sustainable-cocoa-programme/Factsheets/Geolocation_FactSheet-2026.pdf); [EFI Insight Dec 2025](https://efi.int/sites/default/files/files/flegtredd/TF/Documents/Insight%20-%20Geolocation%20and%20the%20EUDR%20Dec25.pdf)
- **JRC.** A JRC technical report relevant to EUDR geodata. — [JRC141229](https://publications.jrc.ec.europa.eu/repository/bitstream/JRC141229/JRC141229_01.pdf). Content not reviewed (**verify**).

### Inferences
- No library tracks V4 reliably. For an API phase, generate a client directly from the V4 WSDLs.
- For validation, write a small in-house validator against the official rules in section 1, using turf.js or shapely. Ship the official Type I and Type II example files as fixtures.
- AGPL licensing on eudr-api-client matters if EUDR-Snap is hosted as a service.

### Gaps
- Licenses and maintenance status of most repos were not verified.
- No official EUDR GeoJSON JSON Schema or validator from the Commission was found.
