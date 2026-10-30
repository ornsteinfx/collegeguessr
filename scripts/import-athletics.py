"""Join the public NCAA 2026-27 active-member directory to IPEDS, rejecting ambiguity."""
import json,re,urllib.parse,urllib.request,pathlib,datetime
root=pathlib.Path(__file__).resolve().parents[1]
url='https://web3.ncaa.org/directory/api/directory/memberList?type=1'
cache=root/'scripts/cache';cache.mkdir(exist_ok=True)
target=cache/'ncaa-members.json'
if not target.exists():urllib.request.urlretrieve(url,target)
records=json.loads(target.read_text());colleges=json.loads((root/'src/data/colleges.json').read_text())
def norm(s):return re.sub('[^a-z0-9]','',s.lower())
def domain(s):return urllib.parse.urlparse(s if '://' in s else 'https://'+s).netloc.lower().removeprefix('www.')
manifest=[]
for c in colleges:
 matches=[r for r in records if r['memberOrgAddress']['state']==c['state'] and (norm(r['nameOfficial'])==norm(c['name']) or domain(r['webSiteUrl'] or '')==domain(c['officialWebsite']))]
 if len(matches)!=1:continue
 r=matches[0]
 if r['division'] not in [1,2,3] or r['academicYear']!=2027:continue
 c.update(athleticAssociation='NCAA',ncaaDivision={1:'I',2:'II',3:'III'}[r['division']],conference=(r['conferenceName'] or 'Independent').strip(),athleticsSeason='2026–27',ncaaId=str(r['orgId']),dataVerified=True,eligibleAsAnswer=True)
 c['sourceUrls'].append('https://web3.ncaa.org/directory/orgDetail?id='+str(r['orgId']))
 manifest.append(dict(ipedsId=c['id'],ncaaId=str(r['orgId']),ipedsName=c['name'],ncaaName=r['nameOfficial'],match='same state AND (normalized exact name OR exact institutional website host); unique match required',division=c['ncaaDivision'],conference=c['conference'],academicYear=r['academicYear'],source=url))
(root/'src/data/colleges.json').write_text(json.dumps(colleges,indent=2))
(root/'src/data/athleticsManifest.json').write_text(json.dumps(manifest,indent=2))
m=json.loads((root/'src/data/dataManifest.json').read_text());m.update(version='2026-27-v1',eligible=len(manifest),athletics='Official NCAA active-member directory, academicYear=2027 (2026–27), retrieved 2026-10-30',missing='No licensed ranking source: every rank is null. Unmatched institutions retain unknown division and primary conference and are excluded as mystery answers.',sources=m['sources']+[url]);(root/'src/data/dataManifest.json').write_text(json.dumps(m,indent=2))
# First production schedule. Never regenerate after publication.
schedule=root/'src/data/schedule-v1.json'
if not schedule.exists():
 import random
 ids=sorted(c['id'] for c in colleges if c['eligibleAsAnswer']);random.Random(827631).shuffle(ids);schedule.write_text(json.dumps(ids,indent=2))
print('Eligible:',len(manifest))
