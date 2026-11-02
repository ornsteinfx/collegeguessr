"""Reproduce requested university + liberal arts pool using official Fall 2023 undergraduate data."""
from pathlib import Path
import csv,io,json,random,re,urllib.parse,urllib.request,zipfile,hashlib
root=Path(__file__).resolve().parents[1];cache=root/'scripts/cache';cache.mkdir(exist_ok=True)
sources={'hd.zip':'HD2023.zip','ef.zip':'EF2023A.zip','retention.zip':'DRVEF2023.zip','graduation.zip':'DRVGR2023.zip'}
for filename,source in sources.items():
 if not (cache/filename).exists():urllib.request.urlretrieve('https://nces.ed.gov/ipeds/datacenter/data/'+source,cache/filename)
if not (cache/'ncaa-members.json').exists():urllib.request.urlretrieve('https://web3.ncaa.org/directory/api/directory/memberList?type=1',cache/'ncaa-members.json')
def read(key):
 z=zipfile.ZipFile(cache/(key+'.zip'));return [{k.strip():v.strip() for k,v in row.items()} for row in csv.DictReader(io.TextIOWrapper(z.open(z.namelist()[0]),encoding='utf-8-sig'))]
def norm(s):return re.sub('[^a-z0-9]','',re.sub(r'\b(of|the|at|main|campus)\b','',s.lower()))
def domain(s):return urllib.parse.urlparse(s if '://' in s else 'https://'+s).netloc.lower().removeprefix('www.')
hd=read('hd');ret={r['UNITID']:r for r in read('retention')};gr={r['UNITID']:r for r in read('graduation')};ef={r['UNITID']:r for r in read('ef') if r['EFALEVEL']=='2'};ncaa=json.loads((cache/'ncaa-members.json').read_text())
requests=json.loads((root/'src/data/requestedColleges.json').read_text())
lacs=[('Williams College','MA'),('Amherst College','MA'),('Swarthmore College','PA'),('Bowdoin College','ME'),('Pomona College','CA'),('Wellesley College','MA'),('Carleton College','MN'),('Claremont McKenna College','CA'),('Middlebury College','VT'),('Davidson College','NC'),('Grinnell College','IA'),('Hamilton College','NY'),('Vassar College','NY'),('Colby College','ME'),('Wesleyan University','CT'),('Haverford College','PA'),('Bates College','ME'),('Colgate University','NY'),('Harvey Mudd College','CA'),('Washington and Lee University','VA')]
requests += [dict(name=n,state=s,liberalArts=True) for n,s in lacs]
ids={'Columbia University':'190150','University of Michigan':'170976','University of Washington':'236948','Virginia Tech':'233921','William and Mary':'231624','Texas A&M University':'228723','Tulane University':'160755','University of Pittsburgh':'215293','North Carolina State University':'199193','University of Missouri':'178396','University of Oklahoma':'207500','Arizona State University':'104151','University of South Carolina':'218663','Miami University':'204024',"St. John's University":'195809','Colorado State University':'126818','Louisiana State University':'159391'}
reviewed={'186380':587,'203517':331,'204024':414,'204857':519,'112260':142,'115409':142,'121345':549}
old={c['id']:c for c in json.loads((root/'src/data/colleges.json').read_text())};selected=[]
for q in requests:
 matches=[h for h in hd if h['UNITID']==ids[q['name']]] if q['name'] in ids else [h for h in hd if h['STABBR']==q['state'] and norm(h['INSTNM'])==norm(q['name'])]
 assert len(matches)==1,(q['name'],[(h['UNITID'],h['INSTNM']) for h in matches]);h=matches[0];i=h['UNITID']
 exact=[n for n in ncaa if n['memberOrgAddress']['state']==h['STABBR'] and norm(n['nameOfficial'])==norm(h['INSTNM'])]
 ns=[n for n in ncaa if n['orgId']==reviewed[i]] if i in reviewed else exact or [n for n in ncaa if n['memberOrgAddress']['state']==h['STABBR'] and domain(n['webSiteUrl'] or '')==domain(h['WEBADDR'])]
 assert len(ns)==1,(q['name'],'NCAA',[(n['orgId'],n['nameOfficial']) for n in ns]);n=ns[0]
 en=int(ret[i]['EFUG']);assert en==int(ef[i]['EFTOTLT']),(i,en,ef[i]['EFTOTLT'])
 g=float(gr[i]['GBA6RTT']);r=float(ret[i]['RET_PCF']);assert en>0 and 0<=g<=100 and 0<=r<=100
 c=dict(id=i,ipedsId=i,name=q['name'],shortName=old.get(i,{}).get('shortName',q['name']),aliases=sorted(set([v.strip() for v in h['IALIAS'].split('|') if v.strip()]+old.get(i,{}).get('aliases',[])+[h['INSTNM'],q['name']])),state=h['STABBR'],city=h['CITY'],institutionType='public' if h['CONTROL']=='1' else 'private',enrollment=en,enrollmentYear='Fall 2023 (undergraduate only)',enrollmentMetric='undergraduate',rank=0,rankCategory='Selected college academic outcomes',rankSource='CollegeGuessr Academic Outcomes Index',rankYear='2023-ug-v1',athleticAssociation='NCAA',ncaaDivision={1:'I',2:'II',3:'III'}[n['division']],conference=(n['conferenceName'] or 'Independent').strip(),footballConference=None,officialWebsite=h['WEBADDR'] if h['WEBADDR'].startswith('http') else 'https://'+h['WEBADDR'],sourceUrls=['https://nces.ed.gov/ipeds/datacenter/data/'+f for f in ['HD2023.zip','EF2023A.zip','DRVEF2023.zip','DRVGR2023.zip']]+['https://web3.ncaa.org/directory/orgDetail?id='+str(n['orgId'])],eligibleAsAnswer=True,dataVerified=True,classification=int(h['C21BASIC']),selectionReason='User-requested university' if not q.get('liberalArts') else 'Added liberal arts college',reportedBasketballConference=None,athleticsSeason='2026–27',ncaaId=str(n['orgId']),academicScore=round(.65*g+.35*r,2),graduationRate=g,retentionRate=r,ncaaName=n['nameOfficial'],matchMethod='Reviewed campus/joint-athletics crosswalk' if i in reviewed else 'Same state and unique name or website',liberalArts=bool(q.get('liberalArts')))
 selected.append(c)
selected.sort(key=lambda c:(-c['academicScore'],-c['graduationRate'],-c['retentionRate'],int(c['id'])))
for j,c in enumerate(selected):c['rank']=j+1
assert len(selected)==169 and len({c['id'] for c in selected})==169
manifest=dict(version='requested-undergraduate-2023-v1',total=len(selected),eligible=len(selected),selection='All 149 supplied universities plus 20 liberal arts colleges. Includes NCAA Divisions I, II and III. The supplied approximate total enrollments and unsourced ranking numbers are retained only as input provenance, not used in gameplay.',ranking='CollegeGuessr Academic Outcomes Index: 65% six-year bachelor graduation rate + 35% full-time retention rate. Ordinal positions are relative to this selected pool, not a published national ranking. Exact positions are hidden in gameplay.',enrollment='Undergraduate enrollment only, Fall 2023: IPEDS DRVEF2023 EFUG, independently cross-checked against EF2023A EFALEVEL=2 EFTOTLT for every school',graduation='IPEDS DRVGR2023 GBA6RTT: six-year bachelor graduation rate',retention='IPEDS DRVEF2023 RET_PCF: full-time retention rate',athletics='Official NCAA primary all-sports conference, 2026–27; includes jointly operated Claremont-Mudd-Scripps and Pomona-Pitzer athletics',missing='Every selected school has verified comparison metrics. Outcomes reflect student mix and resources and are not a comprehensive measure of academic quality.',sources=['https://nces.ed.gov/ipeds/datacenter/data/'+f for f in ['HD2023.zip','EF2023A.zip','DRVEF2023.zip','DRVGR2023.zip']]+['https://web3.ncaa.org/directory/api/directory/memberList?type=1'])
def write(n,d):(root/'src/data'/n).write_text(json.dumps(d,indent=2)+'\n')
write('colleges.json',selected);write('dataManifest.json',manifest)
write('academicRanking.json',dict(methodology=manifest,candidates=selected,reviewedCrosswalks=reviewed,sourceChecksums={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in cache.glob('*.zip')}))
write('athleticsManifest.json',[dict(ipedsId=c['id'],ncaaId=c['ncaaId'],ipedsName=c['name'],ncaaName=c['ncaaName'],division=c['ncaaDivision'],conference=c['conference'],academicYear=2027,match=c['matchMethod']) for c in selected])
# A frozen, seeded year of shuffled cycles. No repetition until every school has appeared.
schedule=[];rng=random.Random(20261101)
while len(schedule)<365:
 cycle=sorted(c['id'] for c in selected);rng.shuffle(cycle)
 if schedule and cycle[0]==schedule[-1]:cycle[0],cycle[1]=cycle[1],cycle[0]
 schedule.extend(cycle)

if not (root/'src/data/schedule-requested-v1.json').exists():write('schedule-requested-v1.json',schedule[:365])
print('Verified',len(selected),'schools; 365 scheduled days; undergraduate cross-check passed')
