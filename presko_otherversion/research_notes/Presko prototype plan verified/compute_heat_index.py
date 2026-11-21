import json, math, sys, collections
d = sys.argv[1]
def hi_f(T, RH):
    s = 0.5*(T+61.0+(T-68.0)*1.2+RH*0.094)
    if (s+T)/2 < 80: return (s+T)/2
    hi = (-42.379+2.04901523*T+10.14333127*RH-.22475541*T*RH-.00683783*T*T
          -.05481717*RH*RH+.00122874*T*T*RH+.00085282*T*RH*RH-.00000199*T*T*RH*RH)
    if RH<13 and 80<=T<=112: hi -= ((13-RH)/4)*math.sqrt((17-abs(T-95.))/17)
    elif RH>85 and 80<=T<=87: hi += ((RH-85)/10)*((87-T)/5)
    return hi
def hi_c(tc, rh): return (hi_f(tc*9/5+32, rh)-32)*5/9
def daily(fn):
    j = json.load(open(f"{d}/{fn}", encoding="utf-8"))
    h = j["hourly"]; out = collections.OrderedDict()
    for t, T, RH in zip(h["time"], h["temperature_2m"], h["relative_humidity_2m"]):
        day, hr = t[:10], int(t[11:13])
        hi = hi_c(T, RH); o = out.setdefault(day, {"max":-99,"hr":None,"T":None,"RH":None,"hi14":None,"tmax":-99})
        if hi > o["max"]: o.update(max=hi, hr=hr, T=T, RH=RH)
        if hr == 14: o["hi14"] = hi
        o["tmax"] = max(o["tmax"], T)
    return j, out
j, bm = daily("openmeteo_iloilo_2024-04_archive.json")
atmax = dict(zip(j["daily"]["time"], j["daily"]["apparent_temperature_max"]))
tmax = dict(zip(j["daily"]["time"], j["daily"]["temperature_2m_max"]))
others = {m: daily(f"openmeteo_iloilo_2024-04_{m}.json")[1] for m in ["era5","era5_land","ecmwf_ifs"]}
print("| Date | Tmax °C | HI max °C (hour, T, RH) | HI @14:00 | Open-Meteo AT max | AT−HI | HI max ERA5 | HI max ERA5-Land | HI max IFS |")
print("|---|---|---|---|---|---|---|---|---|")
diffs=[]; s=collections.defaultdict(list)
for day,o in bm.items():
    diffs.append(atmax[day]-o["max"])
    for m in others: s[m].append(others[m][day]["max"])
    s["bm"].append(o["max"]); s["at"].append(atmax[day]); s["hr"].append(o["hr"]); s["h14"].append(o["hi14"])
    print(f"| {day} | {tmax[day]:.1f} | {o['max']:.1f} ({o['hr']:02d}h, {o['T']:.1f}, {o['RH']:.0f}%) | {o['hi14']:.1f} | {atmax[day]:.1f} | {atmax[day]-o['max']:+.1f} | {others['era5'][day]['max']:.1f} | {others['era5_land'][day]['max']:.1f} | {others['ecmwf_ifs'][day]['max']:.1f} |")
mean=lambda a: sum(a)/len(a)
print("\nmeans: HImax bm %.1f, AT %.1f, AT-HI %.1f, HI14 %.1f, era5 %.1f, era5land %.1f, ifs %.1f; HI max range %.1f-%.1f; days >=42: %d; peak hours %s"%(mean(s['bm']),mean(s['at']),mean(diffs),mean(s['h14']),mean(s['era5']),mean(s['era5_land']),mean(s['ecmwf_ifs']),min(s['bm']),max(s['bm']),sum(x>=42 for x in s['bm']),collections.Counter(s['hr'])))
for m in others: print(m, "days>=42:", sum(x>=42 for x in s[m]), "max", round(max(s[m]),1))
print("Apr17,21,22,28 bm:", [round(bm[k]['max'],1) for k in ["2024-04-17","2024-04-21","2024-04-22","2024-04-28"]])
for m in others: print(m, [round(others[m][k]['max'],1) for k in ["2024-04-17","2024-04-21","2024-04-22","2024-04-28"]])
