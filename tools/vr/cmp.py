import sys, os
from PIL import Image, ImageChops
a,b=sys.argv[1],sys.argv[2]; bad=0
for f in sorted(os.listdir(a)):
    pa,pb=os.path.join(a,f),os.path.join(b,f)
    if not os.path.exists(pb): print('MISSING',f); bad+=1; continue
    ia,ib=Image.open(pa).convert('RGB'),Image.open(pb).convert('RGB')
    if ia.size!=ib.size: print('SIZE',f,ia.size,ib.size); bad+=1; continue
    d=ImageChops.difference(ia,ib); bbox=d.getbbox()
    if bbox:
        px=sum(1 for p in d.getdata() if max(p)>40)
        print('DIFF',f,bbox,'px>40:',px); bad+=1
print('files',len(os.listdir(a)),'diffs',bad)
