"""Build local, key-free map data from public NCES, Census/us-atlas and Natural Earth data."""
import csv,hashlib,io,json,pathlib,urllib.request,zipfile
root=pathlib.Path(__file__).resolve().parents[1];cache=root/'scripts/cache';cache.mkdir(exist_ok=True)
sources={'hd.zip':'https://nces.ed.gov/ipeds/datacenter/data/HD2023.zip','states.json':'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json','cities.geojson':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson'}
for f,url in sources.items():
 if not (cache/f).exists():urllib.request.urlretrieve(url,cache/f)
z=zipfile.ZipFile(cache/'hd.zip');hd={r['UNITID'].strip():r for r in csv.DictReader(io.TextIOWrapper(z.open(z.namelist()[0]),encoding='utf-8-sig'))};colleges=json.loads((root/'src/data/colleges.json').read_text());locations={}
for c in colleges:
 h=hd[c['id']];lon=float(h['LONGITUD']);lat=float(h['LATITUDE']);assert -180<=lon<=-60 and 18<=lat<=72
 locations[c['id']]={'longitude':lon,'latitude':lat}
(root/'src/data/campusLocations.json').write_text(json.dumps(locations,indent=2)+'\n')
places=json.loads((cache/'cities.geojson').read_text())['features'];cities=[]
for f in places:
 p=f['properties']
 if p['adm0_a3']=='USA' and p['pop_max']>=75000:cities.append({'name':p['name'],'longitude':p['longitude'],'latitude':p['latitude'],'population':p['pop_max']})
cities.sort(key=lambda c:-c['population'])
(root/'src/data/mapCities.json').write_text(json.dumps(cities,indent=2)+'\n')
(root/'src/data/usStates.json').write_text((cache/'states.json').read_text())
(root/'src/data/mapManifest.json').write_text(json.dumps({'campusCount':len(locations),'cityCount':len(cities),'coordinateEdition':'IPEDS HD2023 campus longitude/latitude','states':'us-atlas 3.0.1, 10m US Census-derived state boundaries, Albers USA with Alaska/Hawaii insets','cities':'Natural Earth 1:10m populated places, US places with population >=75,000; zoom thresholds control labels. Contextual map data, not current census population estimates.','sources':sources,'sha256':{f:hashlib.sha256((cache/f).read_bytes()).hexdigest() for f in sources},'attribution':'Campus coordinates: NCES/IPEDS. Boundaries: US Census Bureau via us-atlas (ISC). Cities: Natural Earth, public domain. All map data bundled locally; no map API key or third-party tile requests.'},indent=2)+'\n')
print('Map campuses:',len(locations),'Cities:',len(cities))
