# Heat index calibration: a PAGASA-comparable heat index from Open-Meteo for Iloilo City

Files in this folder: raw JSON `openmeteo_iloilo_2024-04_archive.json` (best_match, includes hourly apparent_temperature, wind and the daily maxima), `openmeteo_iloilo_2024-04_era5.json`, `openmeteo_iloilo_2024-04_era5_land.json` and `openmeteo_iloilo_2024-04_ecmwf_ifs.json` (hourly T/RH per model), and `compute_heat_index.py`, which rebuilds the table below (`python -I -X utf8 compute_heat_index.py "<this folder>"`).

## What formula and inputs does PAGASA use, and how is the daily heat index reported?

### Takeaway
PAGASA uses the NWS Rothfusz (1990) regression, which is a fit to Steadman's table, on temperature and RH observed at its synoptic stations. Its daily product is the **computed maximum HI** for each station, with a 2-day forecast from ECMWF. No PAGASA document I found says whether the "max" is the highest of the hourly or 3-hourly readings or a fixed 2 PM reading. The prototype should use the highest hourly HI between 11:00 and 16:00, and also keep the 14:00 value.

### Cited Findings
- PAGASA slides (Estrebillo, IAAS-CAD, 20 March 2024) say: "HEAT INDEX EQUATION is obtained by multiple regression analysis (from Steadman's table) carried out by Rothfusz (1990)". They give "HI value has an error of ±1.3°" and say "Anderson (2013) showed that this algorithm is most accurate among others, relative to Steadman's table". — [PAGASA special lecture PDF](https://pubfiles.pagasa.dost.gov.ph/climps/climateforum/speciallecture.pdf)
- The same slides describe the 2024 operational method as three steps. (1) "Obtain present-day HI based on observations taken at PAGASA stations". (2) "Generate table & map of computed max HI values for present-day (incl past four days)". (3) "Generate maps of 2-day HI forecast", using the "global forecast model ECWMF" [sic]. For 2022 to early 2023 the forecast was 5 days from "NWP model (WRF)". Public HI issuance started in 2010 for key cities only. NWP was added in 2015 and the process was automated in 2022. — [PAGASA special lecture PDF](https://pubfiles.pagasa.dost.gov.ph/climps/climateforum/speciallecture.pdf)
- A PAGASA official, quoted by GMA, said the formula PAGASA uses (the same as NOAA's) is very sensitive to the measured relative humidity. — [GMA News](https://www.gmanetwork.com/news/scitech/science/501046/the-heat-index-what-it-is-and-how-it-s-computed/story) (search snippet only, UNVERIFIED)
- PAGASA's heat index page has a map of automated weather station (AWS) data in near real time. Its disclaimer tells users to rely on the synoptic-station table instead, and says values "might change when erroneous data are detected in the next update scheduled the following day". — [PAGASA heat index page](https://www.pagasa.dost.gov.ph/weather/heat-index), [bagong.pagasa mirror](https://bagong.pagasa.dost.gov.ph/weather/heat-index)
- News reports from 2020 quote PAGASA posts giving station HI "at 2 p.m." (for example, Science Garden, Quezon City, HI 40 °C at 2 p.m. with T 33.4 °C). — [GMA News](https://www.gmanetwork.com/news/scitech/weather/741901/cavite-city-records-day-s-highest-heat-index-at-47-deg-c/story) (search snippet only, UNVERIFIED)
- Observed or forecast "Iloilo City" HI that PAGASA reported in April 2024 news: 42–43 °C on Apr 17, 42 °C on Apr 21, 44 °C on Apr 22, 44 °C forecast for Apr 24, and 44 °C on Apr 28. — [Inquirer, Apr 17](https://newsinfo.inquirer.net/1930636/heat-index-april-17-42c-to-44c-temperature-in-17-areas), [Inquirer, Apr 21](https://newsinfo.inquirer.net/1932039/heat-index-recorded-on-sunday-april-21), [MB, Apr 22](https://mb.com.ph/2024/4/22/dangerous-heat-index-recorded-in-pasay-city-25-more-areas-on-april-22-1), [MB, Apr 24](https://mb.com.ph/2024/4/24/dangerous-heat-index-may-be-felt-in-metro-manila-29-other-areas-on-april-24-1), [ABS-CBN, Apr 29](https://abs-cbn.com/regions/2024/4/29/iba-zambales-hits-53-c-heat-index-36-areas-face-danger-heat-levels-950) (values from search-result summaries; I did not open each article, so UNVERIFIED per article. Some may be forecasts, not observations.)
- PAGASA's daily summary PDF is at `pubfiles.pagasa.dost.gov.ph/tamss/weather/heat_index_summary.pdf`. My download returned a file that was not a valid PDF and could not be parsed. — [heat_index_summary.pdf](https://pubfiles.pagasa.dost.gov.ph/tamss/weather/heat_index_summary.pdf)

### Inferences
- "Computed max HI" from synoptic stations is most likely the highest HI among the day's synoptic reports, which are hourly or 3-hourly. The 2 PM framing in the news fits that, because the peak usually falls between 12:00 and 15:00. The Open-Meteo data agrees: in April 2024 the hourly HI peaked at 11:00–16:00 on every day, most often at 13:00 (15 of 30 days).
- PAGASA danger categories, as widely reported: Caution 27–32 °C, Extreme Caution 33–41 °C, Danger 42–51 °C, Extreme Danger ≥52 °C. The text of the PAGASA page I fetched does not state them (they are in an image), so these are UNVERIFIED in this pass.

### Gaps
- I found no PAGASA document that says whether daily max HI comes from max(T) paired with coincident RH, from the maximum of HI over the observation hours, or from a fixed 14:00 reading.
- I could not confirm which PAGASA station "Iloilo City" refers to. It is probably the Iloilo synoptic station near the old Mandurriao airport, but that is UNVERIFIED.
- I did not get PAGASA's Iloilo station series for April 2024. I only have news-quoted values for 4–5 days.

## What is the full NWS heat index algorithm, with coefficients?

### Takeaway
Work in °F with RH in %. First average the simple Steadman formula with T. If that average is below 80 °F, it is the result. Otherwise use the Rothfusz regression plus one of the two adjustments.

### Cited Findings
- The WPC page gives the algorithm verbatim. — [NWS WPC heat index equation](https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml) (fetched with curl; WebFetch returned 403)
  - Simple formula: `HI = 0.5 * {T + 61.0 + [(T-68.0)*1.2] + (RH*0.094)}`. "In practice, the simple formula is computed first and the result averaged with the temperature. If this heat index value is 80 degrees F or higher, the full regression equation along with any adjustment as described above is applied."
  - Rothfusz regression: `HI = -42.379 + 2.04901523*T + 10.14333127*RH - .22475541*T*RH - .00683783*T*T - .05481717*RH*RH + .00122874*T*T*RH + .00085282*T*RH*RH - .00000199*T*T*RH*RH`
  - If RH < 13% and 80 ≤ T ≤ 112 °F, subtract `[(13-RH)/4]*SQRT{[17-ABS(T-95.)]/17}`.
  - If RH > 85% and 80 ≤ T ≤ 87 °F, add `[(RH-85)/10] * [(87-T)/5]`.
  - "The Rothfusz regression is not valid for extreme temperature and relative humidity conditions beyond the range of data considered by Steadman."
- The source is the 1990 NWS Technical Attachment SR 90-23 by Lans P. Rothfusz. — [NWS WPC](https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml)

### Inferences
- Reference implementation in JS, matching `compute_heat_index.py`:

```js
function heatIndexC(tC, rh) {
  const T = tC * 9 / 5 + 32;
  const simple = 0.5 * (T + 61 + (T - 68) * 1.2 + rh * 0.094);
  let hi = (simple + T) / 2;
  if (hi >= 80) {
    hi = -42.379 + 2.04901523 * T + 10.14333127 * rh - 0.22475541 * T * rh - 0.00683783 * T * T
       - 0.05481717 * rh * rh + 0.00122874 * T * T * rh + 0.00085282 * T * rh * rh - 0.00000199 * T * T * rh * rh;
    if (rh < 13 && T >= 80 && T <= 112) hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    else if (rh > 85 && T >= 80 && T <= 87) hi += ((rh - 85) / 10) * ((87 - T) / 5);
  }
  return (hi - 32) * 5 / 9;
}
// daily value = max over local hours (in practice the peak falls between 11:00 and 16:00) of heatIndexC(temperature_2m, relative_humidity_2m)
```

- In Iloilo in April the RH < 13% branch never fires. The RH > 85% branch only fires on humid nights, when HI is not the daily max.

### Gaps
- None for the formula itself.

## Open-Meteo: variables, endpoints, the apparent_temperature formula, and the reanalysis source

### Takeaway
Both the archive API (`archive-api.open-meteo.com/v1/archive`) and the forecast API (`api.open-meteo.com/v1/forecast`) provide hourly `temperature_2m`, `relative_humidity_2m` and `apparent_temperature`, plus daily `apparent_temperature_max`. Open-Meteo's apparent_temperature is **not** the NWS heat index. It is a Steadman (BoM-style) AT with wind and solar terms, so the prototype has to compute the Rothfusz HI itself from T and RH.

### Cited Findings
- Archive endpoint: `https://archive-api.open-meteo.com/v1/archive`. Models: ECMWF IFS 9 km hourly (2017–present), ERA5 0.25° hourly (1940–), ERA5-Land 0.1° hourly (1950–), and others. "The default Best Match combines IFS HRES, ERA5 and ERA5-Land seamlessly." Apparent temperature for ERA5 is available only via "ERA5-Seamless" (T/RH from ERA5-Land, wind and solar from ERA5). — [Open-Meteo Historical Weather API docs](https://open-meteo.com/en/docs/historical-weather-api)
- Open-Meteo defines apparent temperature as "perceived feels-like temperature combining wind chill factor, relative humidity and solar radiation". — [Open-Meteo docs](https://open-meteo.com/en/docs/historical-weather-api)
- Exact formula in the source (`Sources/App/Helper/Meteorology.swift`): `ws2 = ws10*0.75`; `e = RH/100 * 6.105 * exp(17.27*T/(237.7+T))` (hPa); `Q = max(0, 0.1*(SW - 550))`, with SW = shortwave radiation, defaulting to 550 when missing; `AT = T + 0.348*e - 0.70*ws2 + 0.70*Q/(ws2+10) - 4.25`. This is Steadman (1994) AT, the Australian BoM form with a radiation term. The code comments cite calculator.academy and open-meteo issue #13. Wind is presumably in m/s internally, which is UNVERIFIED. — [open-meteo GitHub, Meteorology.swift](https://raw.githubusercontent.com/open-meteo/open-meteo/main/Sources/App/Helper/Meteorology.swift)
- Calls actually run here, both returning valid JSON:
  - `https://archive-api.open-meteo.com/v1/archive?latitude=10.72&longitude=122.56&start_date=2024-04-01&end_date=2024-04-30&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m&daily=temperature_2m_max,apparent_temperature_max&timezone=Asia%2FManila` (add `&models=era5`, `era5_land` or `ecmwf_ifs` to pin a model)
  - `https://api.open-meteo.com/v1/forecast?latitude=10.72&longitude=122.56&hourly=temperature_2m,relative_humidity_2m,apparent_temperature&daily=apparent_temperature_max&timezone=Asia%2FManila&forecast_days=3`
  - Grid snapping, taken from the response `latitude`/`longitude`: best_match/IFS snapped to 10.7206, 122.5972 (about 4 km east of the requested point, near the coast). ERA5 snapped to 10.75, 122.50. ERA5-Land snapped to 10.70, 122.60. All report elevation 12 m. — the raw JSON files in this folder
- For April 2024, best_match returned values identical to `ecmwf_ifs`, so after 2017 best match = IFS 9 km here. — computed from the files in this folder

### Inferences
- The AT formula has `+0.348*e`, and at T=35 °C, RH=45% the vapour pressure e ≈ 25 hPa, so humidity adds about 8.7 °C. Then `−4.25`, the wind term (about −1 to −3 °C for 2–4 m/s) and the radiation term (positive at midday) are applied. Near noon these roughly offset, which is why AT_max landed within about ±1.5 °C of HI_max in April 2024 (mean −0.3 °C, range −2.4 to +1.3). The agreement is coincidental. AT will diverge on windy or cloudy days, so do not present AT as "PAGASA heat index".

### Gaps
- I found no published validation of the Open-Meteo AT formula against Steadman's AT tables.

## How big is the bias between gridded data and PAGASA station HI?

### Takeaway
It is large and negative. The IFS/best-match daily max HI for Iloilo in April 2024 was 37.7–40.7 °C on days PAGASA reported 42–44 °C, a bias of roughly −3 to −5 °C. ERA5 at 0.25° came closer (40.7–43.9 °C) but runs about 2.5 °C warmer on every day. The likely driver is gridded midday RH that is too low for a coastal station. Published Philippines-specific HI comparisons are scarce.

### Cited Findings
- My computation, Iloilo City, April 2024. Daily max hourly Rothfusz HI from best_match (IFS) T/RH, alongside Open-Meteo `apparent_temperature_max` and the HI max from pinned models:

| Date | Tmax °C | HI max °C (hour, T, RH) | HI @14:00 | Open-Meteo AT max | AT−HI | HI max ERA5 | HI max ERA5-Land | HI max IFS |
|---|---|---|---|---|---|---|---|---|
| 2024-04-01 | 35.6 | 37.5 (15h, 35.0, 41%) | 37.4 | 38.4 | +0.9 | 38.9 | 36.2 | 37.5 |
| 2024-04-02 | 34.7 | 37.3 (14h, 34.7, 42%) | 37.3 | 37.1 | -0.2 | 39.7 | 36.2 | 37.3 |
| 2024-04-03 | 34.7 | 36.4 (15h, 34.1, 43%) | 36.2 | 36.9 | +0.5 | 38.7 | 36.0 | 36.4 |
| 2024-04-04 | 35.1 | 37.8 (13h, 35.0, 42%) | 37.7 | 37.6 | -0.2 | 40.3 | 36.8 | 37.8 |
| 2024-04-05 | 34.5 | 37.8 (14h, 34.5, 45%) | 37.8 | 36.6 | -1.2 | 40.1 | 37.2 | 37.8 |
| 2024-04-06 | 35.0 | 38.2 (13h, 35.0, 43%) | 37.8 | 37.4 | -0.8 | 41.2 | 37.3 | 38.2 |
| 2024-04-07 | 35.0 | 37.2 (13h, 35.0, 40%) | 36.7 | 37.1 | -0.1 | 40.3 | 37.0 | 37.2 |
| 2024-04-08 | 35.8 | 36.5 (12h, 35.7, 33%) | 35.1 | 37.3 | +0.8 | 36.8 | 34.7 | 36.5 |
| 2024-04-09 | 35.4 | 37.4 (12h, 34.8, 42%) | 36.9 | 37.7 | +0.3 | 39.8 | 36.4 | 37.4 |
| 2024-04-10 | 34.0 | 36.8 (11h, 33.7, 47%) | 36.1 | 35.5 | -1.3 | 39.0 | 35.8 | 36.8 |
| 2024-04-11 | 33.7 | 37.1 (13h, 33.7, 48%) | 36.6 | 36.0 | -1.1 | 39.4 | 35.4 | 37.1 |
| 2024-04-12 | 34.1 | 38.3 (13h, 34.1, 49%) | 37.3 | 37.3 | -1.0 | 40.6 | 37.3 | 38.3 |
| 2024-04-13 | 35.2 | 37.3 (13h, 35.2, 39%) | 37.3 | 37.2 | -0.1 | 40.3 | 37.1 | 37.3 |
| 2024-04-14 | 34.1 | 37.7 (15h, 33.7, 50%) | 37.6 | 37.4 | -0.3 | 39.8 | 36.8 | 37.7 |
| 2024-04-15 | 34.7 | 39.2 (13h, 34.7, 48%) | 38.7 | 37.8 | -1.4 | 41.2 | 38.4 | 39.2 |
| 2024-04-16 | 35.9 | 37.3 (11h, 34.1, 46%) | 36.8 | 37.1 | -0.2 | 40.4 | 36.6 | 37.3 |
| 2024-04-17 | 35.0 | 37.7 (12h, 34.3, 46%) | 37.2 | 37.3 | -0.4 | 40.7 | 36.8 | 37.7 |
| 2024-04-18 | 36.4 | 38.1 (13h, 36.3, 35%) | 37.9 | 38.7 | +0.6 | 41.4 | 37.8 | 38.1 |
| 2024-04-19 | 35.9 | 37.9 (13h, 35.7, 38%) | 37.7 | 38.0 | +0.1 | 41.1 | 37.5 | 37.9 |
| 2024-04-20 | 35.9 | 37.1 (12h, 35.6, 36%) | 36.9 | 37.5 | +0.4 | 39.9 | 36.8 | 37.1 |
| 2024-04-21 | 34.9 | 39.0 (15h, 34.1, 51%) | 38.7 | 37.7 | -1.3 | 41.0 | 37.6 | 39.0 |
| 2024-04-22 | 33.8 | 39.7 (13h, 33.2, 59%) | 37.2 | 37.3 | -2.4 | 43.9 | 40.0 | 39.7 |
| 2024-04-23 | 34.9 | 40.2 (13h, 34.8, 50%) | 38.2 | 40.4 | +0.2 | 43.7 | 40.7 | 40.2 |
| 2024-04-24 | 36.3 | 40.5 (14h, 36.3, 42%) | 40.5 | 40.1 | -0.4 | 42.2 | 39.7 | 40.5 |
| 2024-04-25 | 37.2 | 39.0 (13h, 37.2, 33%) | 38.3 | 40.3 | +1.3 | 41.2 | 38.9 | 39.0 |
| 2024-04-26 | 37.3 | 39.6 (16h, 35.2, 46%) | 38.9 | 38.9 | -0.7 | 42.7 | 39.6 | 39.6 |
| 2024-04-27 | 36.3 | 41.3 (13h, 36.3, 44%) | 40.2 | 40.5 | -0.8 | 44.5 | 40.6 | 41.3 |
| 2024-04-28 | 36.3 | 40.7 (13h, 36.2, 43%) | 40.5 | 41.0 | +0.3 | 43.4 | 40.2 | 40.7 |
| 2024-04-29 | 35.6 | 37.7 (12h, 35.6, 38%) | 36.8 | 37.2 | -0.5 | 40.8 | 37.7 | 37.7 |
| 2024-04-30 | 35.1 | 40.5 (13h, 35.1, 49%) | 39.9 | 39.4 | -1.1 | 43.5 | 39.5 | 40.5 |

  The Tmax column is Open-Meteo `temperature_2m_max`, and "HI @14:00" is HI from the 14:00 local reading. Monthly means: HI max (best_match) 38.3 °C, AT max 38.0 °C, mean AT−HI −0.3 °C, HI@14:00 37.7 °C, ERA5 40.9 °C, ERA5-Land 37.6 °C. Days with HI ≥ 42 °C ("Danger"): best_match/IFS 0, ERA5-Land 0, ERA5 7 (maximum 44.5 °C). — computed from the JSON in this folder
- HI max next to PAGASA-reported Iloilo City HI (news-sourced, UNVERIFIED per article):

| Date | PAGASA (news) | IFS/best_match | ERA5 | ERA5-Land |
|---|---|---|---|---|
| Apr 17 | 42–43 | 37.7 | 40.7 | 36.8 |
| Apr 21 | 42 | 39.0 | 41.0 | 37.6 |
| Apr 22 | 44 | 39.7 | 43.9 | 40.0 |
| Apr 24 (forecast) | 44 | 40.5 | 42.2 | 39.7 |
| Apr 28 | 44 | 40.7 | 43.4 | 40.2 |

- ERA5-Land-derived heat index has a global negative bias against stations: about −0.6 °C for the daily mean and −0.9 °C for the daily max. — WebSearch summary of a dataset paper ([PMC8410920 table](https://pmc.ncbi.nlm.nih.gov/articles/PMC8410920/table/Tab3)). Snippet only, UNVERIFIED.
- An ERA5-Land study found that correlation with stations "drops noticeably in few locations, especially in tropical and sub-tropical countries, such as the Philippines". — [PMC8956721](https://pmc.ncbi.nlm.nih.gov/articles/PMC8956721) (snippet only, UNVERIFIED)
- An assessment of ERA5 against 26 PAGASA stations found ERA5 temperature reliable for Luzon and the Visayas, and slightly worse for Mindanao. — [SPP 2021 proceedings](https://proceedings.spp-online.org/article/view/SPP-2021-PB-16) (snippet only, UNVERIFIED)
- Against radiosondes in the tropics, ERA5 near the surface came out slightly too cold (about 0.2–0.6 K) and too moist (about 2–6%). That points the opposite way from a dry bias, so the sign of the humidity bias is not settled. — [arXiv 2510.09530](https://arxiv.org/pdf/2510.09530) (snippet only, UNVERIFIED)

### Inferences
- The gridded midday RH is only 33–59%, while the grid Tmax (33.7–37.3 °C) is plausible. Under the NWS formula, PAGASA's 42–44 °C at T ≈ 34–36 °C needs RH of about 55–65%. So the shortfall most likely comes from humidity, not temperature. This is an inference from the table and the formula, and it is not verified against station RH.
- For the prototype, compute HI from IFS/best_match T and RH. That is the same model family as PAGASA's ECMWF-based forecast, and it matches what the Open-Meteo forecast API serves. Then apply a **per-station additive offset calibrated against PAGASA-reported values**. From the four observed April 2024 matches (17, 21, 22 and 28 April), the offset is about +4 °C: the differences are 4.3, 3.0, 4.3 and 3.3, a mean of +3.7 °C. Label it clearly as calibrated and give an uncertainty band of ±1.5–2 °C, since PAGASA's own formula error is ±1.3°. Four points is thin, so add more PAGASA daily values if a teammate can collect them.
- The alternative is to correct RH instead of HI: raise midday RH by about 10–15 points before computing HI. This is more physical but harder to justify in a demo. The additive HI offset is simpler.
- Without calibration, raw IFS-based HI never reaches PAGASA "Danger" (42 °C) in Iloilo in April 2024. So an uncalibrated threshold of 42 °C would miss every PAGASA danger day. Either calibrate, or use a lower internal trigger (for example raw HI ≥ 39 °C) and explain it.
- Do not use ERA5 at 0.25° as "closer to PAGASA". Its cell is centred on 10.75, 122.50, inland of the requested point, and it runs about 2.5 °C warmer than IFS on every day, so it overshoots on ordinary days too. It is also archive-only (reanalysis with a delay of several days), not a forecast.

### Gaps
- I found no peer-reviewed study that directly compares gridded reanalysis HI with PAGASA station HI for the Philippines or for Iloilo.
- I could not get PAGASA's full April 2024 Iloilo station series, because the summary PDF did not parse, so the bias is estimated from four or five news-reported days.
- Whether PAGASA's value comes from the max of 3-hourly synoptic reports or of hourly AWS reports could shift the comparison by about 0.5–1 °C. This is unresolved.
