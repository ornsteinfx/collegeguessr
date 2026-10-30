"""Reproduce the approved 150-school D1 Academic Outcomes Index, edition 2023-v1."""
from pathlib import Path
import csv, io, json, random, re, urllib.parse, urllib.request, zipfile, hashlib
root=Path(__file__).resolve().parents[1];cache=root/'scripts/cache';cache.mkdir(exist_ok=True)
base='https://nces.ed.gov/ipeds/datacenter/data/'
sources={'hd':base+'HD2023.zip','ef':base+'EF2023A.zip','graduation':base+'DRVGR2023.zip','retention':base+'DRVEF2023.zip'}
for key,url in sources.items():
 if not (cache/(key+'.zip')).exists():urllib.request.urlretrieve(url,cache/(key+'.zip'))
ncaa_url='https://web3.ncaa.org/directory/api/directory/memberList?type=1'
if not (cache/'ncaa-members.json').exists():urllib.request.urlretrieve(ncaa_url,cache/'ncaa-members.json')
def read(key):
 z=zipfile.ZipFile(cache/(key+'.zip'));return [{k.strip():v.strip() for k,v in row.items()} for row in csv.DictReader(io.TextIOWrapper(z.open(z.namelist()[0]),encoding='utf-8-sig'))]
def norm(s):return re.sub('[^a-z0-9]','',s.lower())
def domain(s):return urllib.parse.urlparse(s if '://' in s else 'https://'+s).netloc.lower().removeprefix('www.')
def number(s):
 try:return float(s)
 except (ValueError,TypeError):return None
hd=read('hd');ef={r['UNITID']:r for r in read('ef') if r['EFALEVEL']=='1'};gr={r['UNITID']:r for r in read('graduation')};ret={r['UNITID']:r for r in read('retention')};ncaa=json.loads((cache/'ncaa-members.json').read_text())
states=set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split())
# Explicit main-campus crosswalks reviewed against the named NCAA institution and NCES campus identity.
reviewed={'186380':587,'203517':331,'204024':414,'204857':519}
qualified=[];excluded=[]
for h in hd:
 if h['CONTROL'] not in ['1','2','3'] or h['ICLEVEL']!='1' or h['UGOFFER']!='1' or h['STABBR'] not in states:continue
 if h['UNITID'] not in reviewed and any(domain(n['webSiteUrl'] or '')==domain(h['WEBADDR']) for n in ncaa if n['orgId'] in reviewed.values()):continue
 exact=[n for n in ncaa if n['memberOrgAddress']['state']==h['STABBR'] and norm(n['nameOfficial'])==norm(h['INSTNM'])]
 if h['UNITID'] in reviewed:exact=[n for n in ncaa if n['orgId']==reviewed[h['UNITID']] and n['memberOrgAddress']['state']==h['STABBR']]
 matches=exact if exact else [n for n in ncaa if n['memberOrgAddress']['state']==h['STABBR'] and domain(n['webSiteUrl'] or '')==domain(h['WEBADDR'])]
 if len(matches)!=1:continue
 n=matches[0]
 if n['division']!=1 or n['academicYear']!=2027:continue
 i=h['UNITID'];g=number(gr.get(i,{}).get('GBA6RTT'));r=number(ret.get(i,{}).get('RET_PCF'));en=number(ef.get(i,{}).get('EFTOTLT'))
 if g is None or r is None or en is None or en<=0 or not 0<=g<=100 or not 0<=r<=100:
  excluded.append({'id':i,'name':h['INSTNM'],'reason':'Missing valid enrollment, six-year bachelor graduation rate or full-time retention rate'});continue
 website=h['WEBADDR'] if h['WEBADDR'].startswith('http') else 'https://'+h['WEBADDR']
 score=round(.65*g+.35*r,2)
 qualified.append(dict(id=i,ipedsId=i,name=h['INSTNM'],shortName=h['INSTNM'],aliases=sorted(set([v.strip() for v in h['IALIAS'].split('|') if v.strip()])),state=h['STABBR'],city=h['CITY'],institutionType='public' if h['CONTROL']=='1' else 'private',enrollment=int(en),enrollmentYear='Fall 2023',rank=0,rankCategory='NCAA Division I academic outcomes',rankSource='CollegeGuessr Academic Outcomes Index',rankYear='2023-v1',athleticAssociation='NCAA',ncaaDivision='I',conference=(n['conferenceName'] or 'Independent').strip(),footballConference=None,officialWebsite=website,sourceUrls=list(sources.values())+['https://web3.ncaa.org/directory/orgDetail?id='+str(n['orgId'])],eligibleAsAnswer=True,dataVerified=True,classification=int(h['C21BASIC']),selectionReason='Top 150 by approved index: 65% six-year bachelor graduation rate + 35% full-time retention rate; NCAA Division I only',reportedBasketballConference=None,athleticsSeason='2026–27',ncaaId=str(n['orgId']),academicScore=score,graduationRate=g,retentionRate=r,ncaaName=n['nameOfficial'],matchMethod='Reviewed main-campus NCES/NCAA identifier crosswalk' if i in reviewed else 'Same state + unique normalized exact name' if exact else 'Same state + unique exact website host'))
# A domain cannot identify multiple campuses. Reject every ambiguous institutional mapping.
counts={}
for c in qualified:counts[c['ncaaId']]=counts.get(c['ncaaId'],0)+1
unique=[]
for c in qualified:
 if counts[c['ncaaId']]>1:excluded.append({'id':c['id'],'name':c['name'],'reason':'Ambiguous multiple IPEDS institutions mapped to one NCAA ID'})
 else:unique.append(c)
unique.sort(key=lambda c:(-c['academicScore'],-c['graduationRate'],-c['retentionRate'],int(c['id'])))
for i,c in enumerate(unique):c['rank']=i+1
selected=unique[:150]
assert len(selected)==150
short={'110635':'UC Berkeley','110662':'UCLA','110680':'UC San Diego','110644':'UC Davis','110653':'UC Irvine','110705':'UC Santa Barbara','190150':'Columbia University','186380':'Rutgers–New Brunswick','139755':'Georgia Tech','170976':'University of Michigan','214777':'Penn State','228778':'Texas at Austin','163286':'University of Maryland','126614':'University of Colorado Boulder'}
aliases={'145637':['UIUC','Illinois Urbana-Champaign'],'214777':['PSU','Penn State'],'163286':['UMD','Maryland'],'240444':['UW Madison'],'139755':['GT','Georgia Tech'],'228723':['TAMU','Texas A&M'],'129020':['UConn'],'215293':['Pitt'],'204796':['OSU','Ohio State'],'209542':['OSU','Oregon State'],'207388':['OSU','Oklahoma State'],'166027':['Harvard'],'153603':['Iowa State','ISU']}
for c in selected:
 c['aliases']=sorted(set(c['aliases']+aliases.get(c['id'],[])))
 if c['id'] in short:c['shortName']=short[c['id']];c['aliases']=sorted(set(c['aliases']+[short[c['id']]]))

(root/'src/data/colleges.json').write_text(json.dumps(selected,indent=2)+'\n')
manifest=dict(version='d1-academic-2023-v1',total=150,eligible=150,qualifiedD1=len(unique),selection='The 150 highest-scoring uniquely matched NCAA Division I institutions with complete official NCES metrics. Score = 0.65 × six-year bachelor graduation rate + 0.35 × full-time retention rate (both percentages). Sort descending score, then graduation rate, then retention rate; UNITID breaks remaining ties. Rank is ordinal among the qualified D1 candidate pool, not a published national all-college rank.',ranking='CollegeGuessr Academic Outcomes Index, 2023-v1. A custom outcomes index approved by the user; not a US News ranking or a comprehensive assessment of academic quality.',enrollment='IPEDS EF2023A EFALEVEL=1, EFTOTLT: total Fall 2023 enrollment',graduation='IPEDS DRVGR2023 GBA6RTT: six-year graduation rate, full-time first-time bachelor-seeking 2017 cohort',retention='IPEDS DRVEF2023 RET_PCF: full-time retention rate in Fall 2023, following the prior fall cohort',athletics='Official NCAA active-member directory, academicYear=2027 (2026–27), retrieved October 30, 2026; institutional primary conference, not football-only membership',missing='No selected school is missing a comparison field. Candidate schools without complete metrics or unambiguous NCAA identity are excluded. The index measures these two outcomes only; it does not measure faculty quality, research, selectivity or student learning, and is affected by student mix, resources and allowable exclusions.',sources=list(sources.values())+[ncaa_url,base+'DRVGR2023_Dict.zip',base+'DRVEF2023_Dict.zip'])
(root/'src/data/dataManifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(root/'src/data/academicRanking.json').write_text(json.dumps({'methodology':manifest,'candidates':[{k:c[k] for k in ['id','ncaaId','name','ncaaName','matchMethod','academicScore','graduationRate','retentionRate','rank','conference','sourceUrls']} for c in unique],'excludedAfterMatch':excluded,'unmatchedD1':[{'ncaaId':n['orgId'],'name':n['nameOfficial'],'reason':'No unambiguous eligible NCES institution match'} for n in ncaa if n['division']==1 and str(n['orgId']) not in {c['ncaaId'] for c in unique}],'reviewedCrosswalks':reviewed,'ncaaSnapshotChecksum':hashlib.sha256((cache/'ncaa-members.json').read_bytes()).hexdigest(),'sourceChecksums':{k:hashlib.sha256((cache/(k+'.zip')).read_bytes()).hexdigest() for k in sources}},indent=2)+'\n')
(root/'src/data/athleticsManifest.json').write_text(json.dumps([dict(ipedsId=c['id'],ncaaId=c['ncaaId'],ipedsName=c['name'],ncaaName=c['ncaaName'],division='I',conference=c['conference'],academicYear=2027,match=c['matchMethod'],source=ncaa_url) for c in selected],indent=2)+'\n')
schedule=root/'src/data/schedule-d1-v1.json'
if not schedule.exists():
 ids=sorted(c['id'] for c in selected);random.Random(827631).shuffle(ids);schedule.write_text(json.dumps(ids,indent=2)+'\n')
print('Selected',len(selected),'of',len(unique),'qualified D1 institutions')
for c in selected[:15]:print(c['rank'],c['name'],c['academicScore'])
