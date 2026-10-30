import csv,io,zipfile,json,pathlib,openpyxl,random
root=pathlib.Path(__file__).resolve().parents[1];(root/'src/data').mkdir(parents=True,exist_ok=True)
cache=root/'scripts/cache';cache.mkdir(exist_ok=True)
import urllib.request
for filename in ['HD2023','IC2023','EF2023A','IC2023_Dict']:
 target=cache/({'HD2023':'hd','IC2023':'ic','EF2023A':'ef','IC2023_Dict':'icdict'}[filename]+'.zip')
 if not target.exists():urllib.request.urlretrieve('https://nces.ed.gov/ipeds/datacenter/data/'+filename+'.zip',target)
with zipfile.ZipFile(cache/'icdict.zip') as z:z.extractall(cache)
def read(f):
 z=zipfile.ZipFile(str(root/'scripts/cache')+'/'+f+'.zip');return list(csv.DictReader(io.TextIOWrapper(z.open(z.namelist()[0]),encoding='utf-8-sig')))
hd=read('hd');ic={r['UNITID']:r for r in read('ic')};ef={r['UNITID']:r for r in read('ef') if r['EFALEVEL'].strip()=='1'}
w=openpyxl.load_workbook(root/'scripts/cache/IC2023_dict.xlsx');conf={str(r[2]):r[3] for r in w['Frequencies'].values if r[1]=='CONFNO2' and str(r[2]).isdigit()}
rows=[]
for h in hd:
 i=h['UNITID'];e=ef.get(i);a=ic.get(i,{})
 if h['CONTROL'] not in ['1','2'] or h['ICLEVEL']!='1' or h['UGOFFER']!='1' or not e or h['STABBR'] in ['PR','GU','VI','AS','MP','FM','MH','PW']:continue
 n=int(e['EFTOTLT']);c=int(h['C21BASIC'])
 if c not in range(15,24) or n<=0:continue
 rows.append(dict(id=i,ipedsId=i,name=h['INSTNM'],shortName=h['INSTNM'],aliases=[v.strip() for v in h['IALIAS'].split('|') if v.strip()],state=h['STABBR'],city=h['CITY'],institutionType='public' if h['CONTROL']=='1' else 'private',enrollment=n,enrollmentYear='Fall 2023',rank=None,rankCategory=None,rankSource=None,rankYear=None,athleticAssociation='NCAA' if a.get('ASSOC1')=='1' else None,ncaaDivision=None,conference=None,footballConference=None,reportedBasketballConference=conf.get(a.get('CONFNO2')),officialWebsite=('https://'+h['WEBADDR'] if not h['WEBADDR'].startswith('http') else h['WEBADDR']),sourceUrls=['https://nces.ed.gov/ipeds/datacenter/data/HD2023.zip','https://nces.ed.gov/ipeds/datacenter/data/EF2023A.zip','https://nces.ed.gov/ipeds/datacenter/data/IC2023.zip'],eligibleAsAnswer=False,dataVerified=False,classification=c,selectionReason='2021 Carnegie doctoral, masters or baccalaureate arts/sciences classification; stratified enrollment selection'))
# All baccalaureate arts/sciences first; then research universities; then masters, stratified by state.
rows.sort(key=lambda r:(0 if r['classification']==21 else 1 if r['classification'] in [15,16] else 2,-r['enrollment'],r['id']))
rows=rows[:500];rows.sort(key=lambda r:r['name'])
aliases={'110662':['UCLA'],'145637':['UIUC','Illinois Urbana-Champaign'],'214777':['PSU','Penn State'],'163286':['UMD'],'240444':['UW Madison'],'139755':['GT','Georgia Tech'],'228723':['TAMU'],'129020':['UConn'],'215293':['Pitt'],'204796':['OSU'],'209542':['OSU'],'153603':['MIT'],'166027':['Harvard']}
for r in rows:r['aliases']+=aliases.get(r['id'],[])
(root/'src/data/colleges.json').write_text(json.dumps(rows,indent=2))
(root/'src/data/dataManifest.json').write_text(json.dumps({'version':'2023-preview-v1','total':len(rows),'eligible':0,'selection':'Curated pool, not a ranking: Carnegie 2021 classifications 15–23, public/private nonprofit four-year undergraduate institutions. Prioritize baccalaureate arts/sciences, then R1/R2, then remaining institutions by descending total fall enrollment; UNITID breaks ties. Take 500.','enrollment':'IPEDS EF2023A EFALEVEL=1 EFTOTLT, total fall enrollment 2023','missing':'All ranks, current divisions and current primary conferences. Historical basketball conference retained for audit only. Production release blocked. Preview rounds use the complete enrollment/location/type fields.','sources':rows[0]['sourceUrls']},indent=2))
print(len(rows))
