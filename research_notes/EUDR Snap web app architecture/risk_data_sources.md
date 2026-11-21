# Geospatial and legality data sources for a free EUDR compliance web app (Colombian coffee and cocoa cooperatives), as of 21 November 2026

Scope note: about 25 searches and fetches. Items drawn from background knowledge and not re-confirmed with a 2026 source are marked **verify**. Regulatory context: the EUDR applies from 30 Dec 2026 for medium and large operators and from 30 Jun 2027 for micro and small operators. Micro and small primary operators file a one-off simplified declaration. A Commission simplification package of 4 May 2026 confirmed there is no further postponement. Sources: [Baker McKenzie Dec 2025](https://www.bakermckenzie.com/en/insight/publications/alerts/2025/12/european-union-provisional-agreement-on-eudr-one-year-postponement), [Hogan Lovells](https://www.hoganlovells.com/en/publications/eu-deforestation-regulation-commission-publishes-simplification-package-ahead-of-december-2026), [EY 20 Jan 2026](https://taxnews.ey.com/news/2026-0237-eu-deforestation-regulation-application-postponed-to-30-december-2026).

## Deforestation and forest baselines (Whisp, JRC GFC2020, TMF, Hansen/GFW alerts, IDEAM SMByC) and known map disagreements in agroforestry

### Takeaway
Whisp already bundles almost every global layer plus two IDEAM-derived Colombia layers (`nCO_ideam_forest_2020`, `nCO_ideam_eufo_commission_2020`), so the app should treat Whisp as the core engine. Add GFW integrated alerts for monitoring after 2020 and IDEAM annual figures for context. All global forest maps overestimate forest in shade coffee and cocoa, so a Whisp "high" or "more_info_needed" result should send the plot to human review, never to automatic rejection.

### Cited Findings
**Whisp (FAO / Forest Data Partnership)**
- MIT-licensed open source; "allows commercial use". Third-party data layers carry their own terms, and API use is governed by the ToS at openforis.org/whisp-terms — [GitHub forestdatapartnership/whisp](https://github.com/forestdatapartnership/whisp); [Open Foris Whisp page](https://openforis.org/solutions/whisp/)
- Built on Next.js, PostgreSQL, the `openforis-whisp` Python library and the Google Earth Engine API. Outputs are CSV or GeoJSON, and plots get anonymous Geo-IDs — [Open Foris](https://openforis.org/solutions/whisp/)
- Risk columns: `risk_pcrop` (perennial crops, which covers coffee and cocoa), `risk_acrop`, `risk_timber`, `risk_cattle` ("coming soon"). Values are `low`, `high` or `more_info_needed` — [GitHub](https://github.com/forestdatapartnership/whisp)
- Indicator columns: `Ind_01_treecover`, `Ind_02_commodities`, `Ind_03_disturbance_before_2020`, `Ind_04_disturbance_after_2020`, `Ind_05_primary_2020`, `Ind_06_nat_reg_forest_2020`, `Ind_10_agri_after_2020`, `Ind_12_other_land_2020`, `Ind_13_other_land_gain_after_2020`, `Ind_14_planted_forest_2020`, `Ind_15_cropland_2020`, `Ind_16_plantation_forest_2020`, `Ind_17_plantation_forest_gain_after_2020`. Ind_07/08/09/11 are deprecated but still emitted. The metadata column `whisp_processing_metadata` carries `unavailable_datasets` and `risk_inputs_unavailable` keys, which the app should surface as a reliability flag — [GitHub](https://github.com/forestdatapartnership/whisp)
- Risk logic: an indicator is "yes" when the relevant datasets cover more than a threshold share of the plot. The default threshold is 10%, but it is 50% for commodities in 2020, for disturbance before 2020-12-31 and for some timber indicators. Point plots count any non-zero value. Thresholds can be set with `ind_N_pcent_threshold`. For perennial crops, disturbance before 2020 on a tree-covered plot counts toward low risk — [GitHub](https://github.com/forestdatapartnership/whisp)
- Plain-language rule: **low** = outside mapped forest, OR overlaps a commodity map, OR disturbed before end-2020. **high** = in mapped forest, no commodity overlap, disturbance only after 2020. **more_info_needed** = in forest, no commodity, no disturbance recorded — [Open Foris](https://openforis.org/solutions/whisp/)
- Global columns, verbatim. Tree cover: `EUFO_2020` (JRC GFC2020), `GLAD_Primary`, `TMF_undist`, `GFC_TC_2020`, `ESA_TC_2020`, `Forest_FDaP`, `GFT_primary`, `GFT_naturally_regenerating`, `GFT_planted_plantation`, `IFL_2020`, `IIASA_planted_plantation`, `TMF_regrowth_2024`, `ESRI_2024_TC`, `SBTN_natural_2020`. Commodities: `Coffee_FDaP`, `Coffee_FDaP_2024`, `Cocoa_FDaP`, `Cocoa_2024_FDaP`, `Cocoa_ETH`, `TMF_plant`, oil palm and rubber layers. Disturbance before 2020: `TMF_deg_before_2020`, `TMF_def_before_2020`, `GFC_loss_before_2020`, `RADD_before_2020`, `GLAD-L_before_2020`, `GLAD-S2_before_2020`, MODIS/ESA fire. Disturbance after 2020: `TMF_deg_after_2020`, `TMF_def_after_2020`, `GFC_loss_after_2020`, `RADD_after_2020`, `DIST_after_2020`, `GLAD-L_after_2020`, `GLAD-S2_after_2020`, `MODIS_fire_after_2020`. Agriculture after 2020: `ESRI_crop_gain_after_2020`, `GLAD_crop_gain_after_2020`, `FDaP_tree_crop_gain_after_2020`, `GPW_cultiv_pasture_gain_after_2020`. Location: `Country`, `ProducerCountry`, `Admin_Level_1`, `In_waterbody` — [Whisp layers_description.md](https://raw.githubusercontent.com/forestdatapartnership/whisp/main/layers_description.md)
- **Colombia national layers**, returned only when ISO2 "CO" is passed in `national_codes`:
  - `nCO_ideam_forest_2020`: forest class of IDEAM's 2020 forest/non-forest map
  - `nCO_ideam_eufo_commission_2020`: land that IDEAM maps as non-forest but GFC2020 v2 maps as forest. It is counted with the commodity datasets as "not forest in 2020" and directly targets the shade-coffee false-positive problem
  
  — [layers_description.md](https://raw.githubusercontent.com/forestdatapartnership/whisp/main/layers_description.md)
- Output holds about 124 disaggregated layers, 26 aggregate/risk values and 34 optional national layers, and these counts "may change" — [layers_description.md](https://raw.githubusercontent.com/forestdatapartnership/whisp/main/layers_description.md)

**JRC Global Forest Cover 2020 (EU Observatory)**
- V3 is downloadable as 10°x10° GeoTIFF tiles (`JRC_GFC2020_V3_[lat]_[lon].tif`), with a global mosaic on the JRC Big Data platform. A WMS exists at `https://ies-ows.jrc.ec.europa.eu/iforce/gfc2020/wms.py?` but is RGB only and "not suitable for analysis". Data are free, without restriction of use, under Copernicus terms with attribution — [JRC forobs GFC](https://forobs.jrc.ec.europa.eu/GFC); also on [GEE as JRC/GFC2020/V3](https://developers.google.com/earth-engine/datasets/catalog/JRC_GFC2020_V3)
- A JRC newsletter item dated 19/10/2026 reports that **GFC2020 Version 4** was released through the Observatory, general JRC access and WMS. Not confirmed on JRC pages (**verify**). Whisp's Colombia cross-tab layer was built against v2, so check which version Whisp's `EUFO_2020` currently uses — [EC newsroom redirect](https://ec.europa.eu/newsroom/env/redirection/item/961165)
- GFC2020 reports 91% overall accuracy, an 18% probability of overestimating forest and 8% of underestimating it. Overestimation is "significant ... in regions with agroforestry systems like coffee and cocoa". The authors recommend complementing it with national maps. The map is non-mandatory and has no legal status — [ESSD 18, 1331, 2026](https://essd.copernicus.org/articles/18/1331/2026/); [preprint v3](https://essd.copernicus.org/preprints/essd-2025-351/essd-2025-351-manuscript-version3.pdf)

**GFW Data API / alerts**
- The `gfw_integrated_alerts` dataset combines GLAD-L, GLAD-S2, RADD and, more recently, DIST-ALERT. GLAD-L is resampled from 30 m to 10 m, so integrated alert counts are larger than native GLAD-L counts. DIST-ALERT is 10 m, covers 30°N–30°S, updates daily, and covers non-forest vegetation (crops, grasslands) too, so it detects repeat disturbances — [GFW blog integrated alerts](https://www.globalforestwatch.org/blog/data-and-tools/integrated-deforestation-alerts); [GFW DIST blog](https://www.globalforestwatch.org/blog/data-and-tools/global-vegetation-disturbance-deforestation-alerts); [dataset page](https://data-api.globalforestwatch.org/dataset/gfw_integrated_alerts)
- Access: free account → `api_key` that expires after one year (higher quota via gfw@wri.org). Query: POST `/dataset/gfw_integrated_alerts/latest/query/json` (or `/csv`) with an SQL statement and a geometry, plus an `x-api-key` header. Fields include detection date, confidence (low/nominal/high) and intensity — [GFW developer how-to (preview domain, verify against official docs)](https://developer-portal-prod-e9r.pages.dev/how-tos/integrated-deforestation-alerts-x-global-forest-watch-api); [OpenAPI spec](https://data-api.globalforestwatch.org/openapi.json)

**IDEAM / SMByC (Colombia)**
- Official 2025 annual deforestation figures (published late July 2026): 119,483 ha, up 5.2% from 113,608 ha in 2024 but 18.1% below the 25-year average of 145,802 ha. The Amazon accounted for 77,805 ha (about 65%). Caquetá had 30,414 ha and Meta 22,554 ha, and Putumayo rose 64.6% to 8,961 ha. Deforestation inside national parks fell 19% to 9,388 ha — [El Espectador](https://www.elespectador.com/ambiente/amazonas/crecio-la-deforestacion-en-colombia-en-2025-el-pais-perdio-119000-hectareas/); [Blu Radio](https://www.bluradio.com/nacion/deforestacion-en-colombia-en-2025-el-pais-perdio-119-483-hectareas-de-bosque-natural-rg10); [Mongabay ES](https://es.mongabay.com/short-article/2026/08/colombia-deforestacion-aumento-2025-amazonia-informe/)
- SMByC publishes quarterly early-detection bulletins (DTD). Bulletin 46 (Q1 2026) found 18 detection hotspots, mainly in the Amazon. The Bulletin 47 (Q2 2026) summary lists 25 municipalities with the most deforestation, mostly in the **Andean region**, which matters because that is coffee and cocoa country — [La Silla Vacía copy of DTD 47](https://www.lasillavacia.com/wp-content/uploads/2026/10/boletin_dtd_no_47_version_resumida-1.pdf); [IDEAM file](https://www.ideam.gov.co/index.php/file-download/download/public/21668)

**Map accuracy in agroforestry**
- A review of 21 global forest/tree-cover maps (Freitas Beyer, Köthke and Lippe, Thünen, *Remote Sensing* 2025) found only 2 that measure all EUDR forest-definition parameters. Most overestimate forest and cannot separate forest from tree-based agriculture. In a Mexico case of 600 long-established coffee plots of 1–5 ha, the maps flagged about three-quarters as non-compliant — [Mongabay Dec 2025](https://news.mongabay.com/2025/12/researchers-find-concerning-gaps-in-global-maps-used-for-eudr-compliance/); [MDPI Remote Sensing 17(17):3012](https://www.mdpi.com/2072-4292/17/17/3012)
- Van Noordwijk et al. note that the JRC 2020 map filters known plantations but has "no systematic consideration of agroforestry". They propose complementary evidence such as ground truth and land-use records — [WUR edepot](https://edepot.wur.nl/695313); [Mongabay](https://news.mongabay.com/2025/12/researchers-find-concerning-gaps-in-global-maps-used-for-eudr-compliance/)
- A WUR policy brief on Colombian coffee and palm says Observatory map accuracy is "questionable, particularly in countries like Colombia" — [WUR edepot 686924](https://edepot.wur.nl/686924)
- A farm-level test on Brazilian coffee by a commercial vendor (Space Intelligence, so potential bias) reported overall accuracy of 95% for its own map, 92% for JRC GFC v2 and 91% for MapBiomas C10. MapBiomas flagged 12% of coffee fields as false positives — [ICE PDF](https://www.ice.com/publicdocs/Comparing_Forest_Maps_for_EUDR_at_Farm_Level.pdf)

### Inferences
- Call Whisp with `national_codes=["co"]` (Whisp docs say ISO2 code; the prototype's `nationalCodes: 'co'` naming should be checked against the API schema; **verify** case sensitivity). A plot where `EUFO_2020` is forest but `nCO_ideam_eufo_commission_2020` is set should be shown as "global map says forest, IDEAM says not forest in 2020", which is strong evidence for low risk.
- TMF (JRC Tropical Moist Forest, 30 m Landsat, annual) and Hansen GFC (30 m, annual) are already inside Whisp as `TMF_*` and `GFC_*`. There is no need to call them separately, except for map tiles in the review UI (TMF and GFC are both on GEE; **verify** current TMF version, likely updated to 2024/2025 data).
- GFW integrated alerts are the only practical free source for **ongoing** monitoring after the due-diligence statement. They can be polled weekly per plot.
- MapBiomas Colombia annual land-cover collections (colombia.mapbiomas.org, CC-BY, **verify** latest collection and whether it has a coffee or agroforestry class) are a second national opinion for disputed plots.
- Some legal risk: IDEAM's forest definition (and the minimum mapping unit of its forest/non-forest map) differs from the FAO/EUDR definition (0.5 ha, more than 10% canopy cover, trees taller than 5 m). The app should state which definition it applies (**verify** IDEAM's MMU).

### Gaps
- No public SMByC geoservice (WMS/REST) for DTD alert polygons was found. Bulletins are PDFs. The annual forest/non-forest and change rasters may be on the IDEAM/SIAC geoportal (**verify** endpoints at siac.gov.co / geoservicios IDEAM).
- The exact Whisp API request schema (`/api/submit/geojson` parameters for national codes, rate limits, API key requirement) was not confirmed from docs. Check whisp.openforis.org/documentation.
- GFC2020 V4 release is unconfirmed, as is its accuracy in Colombian agroforestry.
- No Colombia-specific peer-reviewed accuracy study of EUDR maps over coffee or cocoa was found.

## Protected areas: RUNAP and WDPA / Protected Planet

### Takeaway
RUNAP is the legally authoritative Colombian registry. It follows the WDPA standard and is part of SIAC, but no documented public REST/WFS endpoint was confirmed. WDPA (Protected Planet) is easier to call but has non-commercial licence terms.

### Cited Findings
- RUNAP is administered by Parques Nacionales Naturales (PNNC). It is a subsystem of SIAC, follows the WDPA data standard and offers web services (details truncated in source). The 2026 statistical operation plan and an April 2026 manual confirm it is still active — [RUNAP architecture doc](https://www.parquesnacionales.gov.co/wp-content/uploads/2024/04/E3_MN_02_-Arquitectura-RUNAP_V1.docx); [Plan Operación Estadística RUNAP 2026](https://www.parquesnacionales.gov.co/wp-content/uploads/2026/02/Plan-de-la-Operacion-Estadistica-RUNAP_-2026.pdf); [Manual Administrador RUNAP 2026](https://www.parquesnacionales.gov.co/wp-content/uploads/2026/04/M1-MN-01-Manual-Administrador-RUNAP.docx)
- Deforestation inside national parks was 9,388 ha in 2025 — [El Espectador](https://www.elespectador.com/ambiente/amazonas/crecio-la-deforestacion-en-colombia-en-2025-el-pais-perdio-119000-hectareas/)

### Inferences
- **verify**: runap.parquesnacionales.gov.co has offered shapefile/GeoJSON download of all registered areas. Colombian categories include PNN, Parques Naturales Regionales, Distritos de Manejo Integrado (DMI), Reservas Forestales Protectoras and Reservas Naturales de la Sociedad Civil. Coffee in DMIs or in Ley 2ª forest reserves can be legal with permits, so an overlap should be an alert, not an automatic fail.
- **verify**: The Protected Planet API (api.protectedplanet.net) needs a free token. The WDPA licence restricts commercial use without permission, which is acceptable for a free NGO-style tool but should be checked. WDPA updates monthly.
- Also important, and outside RUNAP: the **Ley 2ª de 1959 forest reserve zones** (MinAmbiente, SIAC) and **páramos** (delimited by MinAmbiente, where agriculture is restricted). Both matter for Andean coffee (**verify** layer availability on SIAC geoportal).

### Gaps
- No confirmed RUNAP API or WFS URL. Next step: open runap.parquesnacionales.gov.co and look for the download link, or the PNNC ArcGIS server.

## Third-party rights: indigenous resguardos and Afro-Colombian consejos comunitarios (ANT)

### Takeaway
The ANT publishes resguardos and consejos comunitarios as open data on an ArcGIS Hub portal, which gives a Feature Service usable for point-in-polygon queries. Titled territories are covered. Lands still being claimed (solicitudes, ancestral claims) generally are not.

### Cited Findings
- ANT open data portal (ArcGIS Hub), including a consejos comunitarios dataset page — [data-agenciadetierras.opendata.arcgis.com](https://data-agenciadetierras.opendata.arcgis.com/datasets/agenciadetierras::consejos-comunitarios/about)
- ANT internal guides on publishing to the open-data portal (GINFO-G-024, Mar 2026), data standardisation (INTI-G-004, Jun 2026) and ethnic-territory geographic data (GINFO-I-010) — [GINFO-G-024](https://www.ant.gov.co/sites/default/files/2026-03/documentos/archivos/ginfo-g-024-guia-de-publicacion-y-actualizacion-portal-de-datos-abiertos.pdf); [INTI-G-004](https://www.ant.gov.co/sites/default/files/2026-06/documentos/archivos/inti-g-004-guia-estandarizacion-de-datos-ant.pdf); [GINFO-I-010](https://www.ant.gov.co/sites/default/files/2024-06/documentos/archivos/GINFO-I-010.-INSTRUCTIVO-PARA-LA-DISPOSICIoN-DE-INFORMACIoN-GEOGRAFICA-ASOCIADA-A-LA-....pdf)
- Mirrors exist, for example the CVC (Valle del Cauca CAR) ethnic-groups MapServer attributing the ANT portal, and a 2024 ANT resguardos clip — [CVC MapServer](https://geo.cvc.gov.co/arcgis/rest/services/TERRITORIAL_ADMINISTRATIVA/Grupos_Etnicos/MapServer/layers)
- IGAC has a procedure for managing cartography of collective territories — [IGAC PC-GEG-01](https://igac.gov.co/sites/default/files/listadomaestro/pc-geg-01_gestion_y_disposicion_de_informacion_cartografica_de_territorios_colectivos.pdf)

### Inferences
- Use the Hub's "API / GeoService" link (ArcGIS FeatureServer `query?geometry=...&spatialRel=esriSpatialRelIntersects`) live, or cache nightly as GeoJSON. **verify** the licence (Colombian open data is typically CC-BY 4.0 on datos.gov.co).
- Many cocoa areas (Pacific, Cauca, Nariño, Chocó) and some coffee areas (Cauca, Sierra Nevada) overlap collective titles. An overlap does not imply illegality (members may produce inside their own territory). It should trigger a check on free, prior and informed consent (FPIC) and community-membership documentation.

### Gaps
- The resguardo dataset URL and update frequency were not confirmed. Pending titling claims and "zonas de reserva campesina" layers were not located.

## Land tenure and cadastre: IGAC catastro multipropósito, SNR folio de matrícula, informality

### Takeaway
No free API answers "who legally owns this plot". Cadastre coverage is still only about 27% of national territory updated under multipurpose cadastre, and rural informality is high. The app should collect tenure evidence (folio number, certificate upload, or a declaration of possession) and not try to verify it automatically.

### Cited Findings
- Multipurpose cadastre: IGAC reported 26.8% of national territory updated as of 2025 (208 municipalities), with more than 30.5 Mha updated in 2024. A SU-288 follow-up committee cites 282 municipalities "in operation" and about 27% progress. An ANT report put coverage at 12.4% as of Jan 2024, measured differently — [El Espectador column citing IGAC](https://www.elespectador.com/opinion/columnistas/eduardo-lora-/a-quien-beneficia-la-titulacion-de-tierras/); [DNP SU-288 acta](https://colaboracion.dnp.gov.co/CDT/Desarrollo%20Territorial/Carpeta%202024/DODT/Instancias/Comit%C3%A9%20Seguimiento%20SU%20288%20Bald%C3%ADos/acta-sesion-21.-comite-SU288-baldios.pdf); [ANT SU-288 informe Jan 2025](https://www.ant.gov.co/sites/default/files/2025-07/documentos/archivos/8-informe-final-su-288-10-de-enero-de-2025.pdf)
- UPRA maintains an "índice de informalidad" and lists high tenure informality as a risk for coffee activity — [UPRA acta de gestión 2025](https://upra.gov.co/sites/default/files/2025-09/F_Unico_EntregaCargo_Ley951_2005_V4.pdf)
- IGAC Aug 2026 compendium on uses of cadastral information — [IGAC](https://www.igac.gov.co/sites/default/files/2026-08/Compendio_El%20Multiprop%C3%B3sito%20del%20Catastro_%20Casos%20de%20Usos%20de%20la%20Informaci%C3%B3n%20Catastral_Alta_c.pdf)

### Inferences
- **verify**: The widely cited figure is that about 52–53% of rural properties have informal tenure (UPRA index, around 2019). No 2025/2026 update was found.
- **verify**: The SNR certificado de tradición y libertad (by folio de matrícula inmobiliaria) is bought online through the SNR certificate portal for a small per-certificate fee (about COP 20,000) and has no free API. The IGAC "Colombia en Mapas" / open-data cadastre gives parcel geometry and the número predial for many municipalities. Bogotá, Antioquia, Cali and Medellín run their own cadastres.
- Recommended data model: store `numero_predial` (30 digits), `folio_matricula` (optional), `tenure_type` (owner / possessor / tenant / collective member) and an uploaded document. Flag "no formal title" as a legality-information gap, not non-compliance. The EUDR requires compliance with "relevant legislation" on land-use rights, and informal possession can be lawful under Colombian law.
- The FNC's **SICA** (Sistema de Información Cafetera) holds georeferenced coffee plots and the cédula cafetera for about 540k growers (**verify** figure and data-sharing terms). Cooperatives may be able to export their members' SICA plots, which is the most powerful source of plot geometry for coffee.

### Gaps
- No public API for SNR or the national IGAC cadastre was confirmed. No current informality percentage was found.

## Legality checks: environmental permits, labour/child labour, RUT/tax, UPRA agricultural frontier

### Takeaway
The UPRA Frontera Agrícola map is the single most useful free legality-proxy layer: inside means agriculture is permitted, while outside means forest, protected or ecologically restricted land. It is 1:100,000 and explicitly "not for property-level analysis", so use it as a flag. Permits, RUT and labour records cannot be verified by API and must be self-declared with document upload.

### Cited Findings
- Frontera Agrícola is defined by Resolución 261 of 21 Jun 2018 (MADR) and amended by Resolución 0000327 of 3 Oct 2025 (arts. 3, 6, 8). UPRA updates it and publishes it for consultation and download on SIPRA. The frontier is about 39.6 Mha (34.7% of the country, 2021 figure). Maps are 1:100,000, and UPRA says the map is not applicable to property-level analysis — [Res. 261 FAOLEX](https://faolex.fao.org/docs/pdf/col191613.pdf); [UPRA Frontera Agrícola PDF](https://upra.gov.co:443/en/Documents/01_Frontera_Agricola.pdf); [Res. 327/2025](https://camacol.co/sites/default/files/descargables/MinAgricultura-Resolucion-2025-N0000327_20251003-DO.pdf); [UPRA Cauca presentation](https://upra.gov.co/Kit_Territorial/2-%20Informaci%C3%B3n%20por%20Departamentos/CAUCA/1-%20Presentaci%C3%B3n%20Regional%20UPRA%20Cauca.pdf)
- A draft proposal (ANDI memo, PN-2026-31255) to change art. 7 on frontier updates has unknown status — [ANDI](https://www.andi.com.co/Uploads/Memoria%20justificativa%20del%20proyecto%20PN-2026-31255.pdf)
- Child labour (DANE GEIH): the national rate was 2.8% in Q4 2025 (2.9% a year earlier), about 302,000 children aged 5–17. The rural rate was 5.2% in 2025 (6.0% in 2024, 7.1% in 2022). The extended rate including household chores is 9.4%. One undated source says agriculture accounts for 61% of cases — [DANE boletín Oct–Dic 2025](https://www.dane.gov.co/files/operaciones/GEIH/bol-GEIHTI-oct-dic2025.pdf); [ICBF](https://www.icbf.gov.co/node/341840); [El Universal](https://www.eluniversal.com.co/colombia/2026/06/12/trabajo-infantil-en-colombia-afecto-a-302000-menores-en-2025/); [Diario del Sur](https://www.diariodelsur.com.co/?p=530794)
- A coffee-specific child labour study (CRECE 2021) is hosted by US DOL — [DOL PDF](https://dol.gov/sites/dolgov/files/Gayar.Arwa.T%40dol.gov/AN5F2E~1.PDF)

### Inferences
- **verify**: The SIPRA download for the Frontera Agrícola is likely shapefile or WMS from sipra.upra.gov.co. The app should check the 2025-amended version.
- **verify**: Environmental permits for coffee and cocoa smallholders mostly involve water concessions and forest-use permits (aprovechamiento forestal) from the regional CAR, plus ANLA's VITAL for licences. There is no consolidated API. Most smallholders need no environmental licence, so use a checklist plus upload.
- **verify**: RUT status lookup on DIAN (MUISCA "consulta estado RUT") is protected by a CAPTCHA and has no public API. Bypassing CAPTCHAs is not acceptable, so the producer should upload their RUT PDF.
- **verify**: The US DOL "List of Goods Produced by Child Labor or Forced Labor" has listed Colombian coffee. Use it as a sector risk flag.
- Use the DANE rural rate as a municipal or regional risk prior, not a plot-level fact.

### Gaps
- No municipal-level child labour dataset was located. Department-level GEIH tabulations may exist in DANE microdata.

## Country benchmark and subnational risk context

### Takeaway
Colombia is classified as **standard risk**. Only Belarus, North Korea, Myanmar and Russia are high risk. Subnationally, use IDEAM's annual and quarterly hotspot municipalities (the Amazon arc of Caquetá, Meta, Guaviare and Putumayo, plus the 2026 Andean hotspots) as a risk multiplier.

### Cited Findings
- Colombia is standard risk, and the high-risk countries are Belarus, DPRK, Myanmar and Russia — [EC Green Forum country classification list](https://green-forum.ec.europa.eu/nature-and-biodiversity/deforestation-regulation-implementation/eudr-cooperation-and-partnerships/country-classification-list_en)
- Classification uses the Art. 29(3) criteria with FAO FRA data. Competent-authority check rates are 1% (low), 3% (standard) and 9% (high). The first review was scheduled for 2026 — [EC Green Forum](https://green-forum.ec.europa.eu/deforestation-regulation-implementation/eudr-cooperation-and-partnerships_en); [CMS](https://cms.law/en/int/publication/european-union-deforestation-regulation/the-eudr-benchmarking-list-is-here-and-comes-as-a-surprise)
- 2025 hotspots by department: Caquetá 30,414 ha, Meta 22,554 ha, Putumayo 8,961 ha (+64.6%). DTD 47 (Q2 2026) puts most of the top 25 municipalities in the Andean region — [El Espectador](https://www.elespectador.com/ambiente/amazonas/crecio-la-deforestacion-en-colombia-en-2025-el-pais-perdio-119000-hectareas/); [DTD 47](https://www.lasillavacia.com/wp-content/uploads/2026/10/boletin_dtd_no_47_version_resumida-1.pdf)

### Inferences
- Whisp's `Admin_Level_1` gives the department. Join it with a static table of IDEAM hotspot municipalities to lift risk. Standard-risk status means full due diligence (no simplified regime) applies to Colombian origin.

### Gaps
- Whether the 2026 benchmarking review has happened, and whether it changed Colombia, was not confirmed. Check the EC page before launch.

## Yield benchmarks for volume plausibility

### Takeaway
Coffee: use about 14 or more 60-kg bags of green coffee per hectare as the national average (≈840 kg green/ha, 2025 USDA figure). Flag declared volumes above about 2–2.5 times that. Cocoa: a national average of roughly 350–500 kg dry beans/ha, with up to about 1,500–2,000 kg/ha on high-tech farms. Flag anything above 2,000 kg/ha.

### Cited Findings
- USDA FAS (2025 annual summary): average density of 5,340 trees/ha and productivity "above 14 bags per hectare" — [Daily Coffee News May 2025](https://dailycoffeenews.com/2025/05/29/colombia-coffee-report-production-decline-predicted-amid-weather-and-regulatory-volatility); [USDA FAS Colombia Coffee Annual](https://www.fas.usda.gov/data/colombia-coffee-annual)
- 2026/27 Colombian production forecast: 13.4 M bags (FAS attaché, spring 2026). The July 2026 USDA circular lowered Colombia 1.3 M bags to 12.5 M because of excess rain. These conflict in timing, so **verify** the marketing year — [RFD-TV](https://www.rfdtv.com/coffee-supplies-rise-while-costs-weather-threaten-gains?p=77); [StoneX](https://www.stonex.com/en-us/insights/usda-attache-reports-reveal-a-fragile-new-phase-for-global-coffee-supply/); [USDA PSD circular Jul 2026](https://apps.fas.usda.gov/psdonline/circulars/2026/07/coffee.pdf)
- Cocoa: 2024 output was 73,678 t (citing Fedecacao), with Santander at 28,044 t (41%). A national average of 350–400 kg/ha (undated) and modern plantings of up to 1,500 kg/ha. Some farms in Arauca, Meta and Santander reach 2,000 kg/ha or more. Exports were US$413.1 M in 2025 (+56%) — [UNAL Agronomía Colombiana](https://revistas.unal.edu.co/index.php/agrocol/article/download/121013/96241/758568); [El Heraldo](https://www.elheraldo.co/cordoba/siembra-de-cacao-una-actividad-rentable-310935); [Portafolio](https://www.portafolio.co/economia/record-en-produccion-de-cacao-en-primer-semestre-508495); [El Espectador](https://www.elespectador.com/economia/el-cacao-colombiano-se-consolida-en-el-mundo-las-exportaciones-subieron-un-56-en-2025/)
- UPRA/MADR EVA (Evaluaciones Agropecuarias) municipal yield data, with 2025 results published Feb 2026 — [UPRA EVA 2025](https://upra.gov.co/sites/default/files/2026-02/03_RdosEVA_VF.pdf)

### Inferences
- Units matter. FNC reports in bags of **green** coffee (60 kg), while cooperatives buy **pergamino seco** (parchment), with about 1.25 kg pergamino ≈ 1 kg green (**verify** FNC conversion factor). Cocoa is in dry beans.
- The best plausibility threshold is municipal EVA yield × 2, with a hard cap. EVA data on datos.gov.co (**verify** dataset ID) gives yields by municipality and crop.

### Gaps
- The 2026 USDA GAIN Colombia Coffee Annual yield table and an official Fedecacao 2025 national yield were not retrieved.

## Satellite imagery for human review (Sentinel-2 / Copernicus Data Space, Planet NICFI)

### Takeaway
Build the review UI on Sentinel-2 (10 m, free, about 5-day revisit) through the Copernicus Data Space Ecosystem. Planet NICFI basemaps can no longer be counted on: they left GFW in April 2025, and GEE access is non-commercial and uncertain beyond 2026.

### Cited Findings
- NICFI PlanetScope tropical mosaics ceased under the NICFI contract on 24 Jan 2025, with a temporary access extension. Planet imagery was removed from GFW on 1 Apr 2025 — [GFW blog](https://www.globalforestwatch.org/blog/data-and-tools/planet-imagery-changes-gfw); [Planet community](https://community.planet.com/tropical-basemaps-85/nicfi-satellite-data-program-prolongs-public-access-to-high-resolution-rainforest-satellite-images-6020)
- The GEE catalog for NICFI basemaps shows conflicting end dates (2025-07 / 2026-02 / 2026-06). Use is restricted to non-commercial use supporting NICFI, and sign-up is required — [GEE NICFI Americas](https://developers.google.com/earth-engine/datasets/catalog/projects_planet-nicfi_assets_basemaps_americas?authuser=2); [GEE NICFI Africa](https://developers.google.com/earth-engine/datasets/catalog/projects_planet-nicfi_assets_basemaps_africa)

### Inferences
- **verify**: Copernicus Data Space (dataspace.copernicus.eu) offers free registration, Sentinel Hub-compatible Process/WMS APIs with a monthly free quota, and an open data licence. Show a 2020 dry-season composite next to the latest cloud-free scene for each plot. Colombia is very cloudy, so Sentinel-1 radar or multi-month composites may be needed.
- **verify**: Esri World Imagery or Google satellite tiles are fine for a basemap view but have no date guarantee and restricted terms.

### Gaps
- NICFI's status after 2026 is unconfirmed.

---

### Recommended combination (synthesis for the report writer)
1. **Core engine:** Whisp `POST /api/submit/geojson` with Colombia national codes → `risk_pcrop` plus indicators. Always show `EUFO_2020` vs `nCO_ideam_forest_2020` / `nCO_ideam_eufo_commission_2020` side by side. Read `whisp_processing_metadata` for missing layers.
2. **Overlay checks (cached GeoJSON, refreshed monthly; point-in-polygon in PostGIS or Turf.js):** RUNAP (+ WDPA fallback), ANT resguardos and consejos comunitarios, UPRA Frontera Agrícola (2025-amended), Ley 2ª reserves and páramos (**verify** availability).
3. **Monitoring:** GFW `gfw_integrated_alerts` (high-confidence alerts after 2020-12-31 inside the plot).
4. **Context:** IDEAM hotspot municipalities, EC benchmark (Colombia standard risk).
5. **Plausibility:** EVA municipal yields (coffee ≈ 14 bags/ha national average; cocoa ≈ 400–500 kg/ha) → flag declared volume above 2× the municipal yield.
6. **Legality documents:** uploads for tenure (folio or predial), RUT and permits, plus a child-labour self-declaration, weighted by the DANE rural rate.
7. **Human review:** Sentinel-2 (Copernicus Data Space) 2020 vs now. Every "high" or "more_info_needed" result in coffee or cocoa goes to review because of the known agroforestry false positives.
