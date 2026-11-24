from PIL import Image, ImageDraw, ImageFilter, ImageFont
import render as R
shot=Image.open('ben.png').convert('RGB')
W,H=1280,720
im=R.gradient(W,H)
glow=Image.new('L',(W,H),0); ImageDraw.Draw(glow).ellipse([700,40,1250,700],fill=130); glow=glow.filter(ImageFilter.GaussianBlur(110))
im.paste(Image.new('RGB',(W,H),(150,70,230)),(0,0),glow)
ph_h=640; ph_w=round(ph_h*886/1660); sx,sy=900-ph_w//2+40,(H-ph_h)//2
sh=Image.new('L',(W,H),0); ImageDraw.Draw(sh).rounded_rectangle([sx-12,sy-12+18,sx+ph_w+12,sy+ph_h+12+18],radius=50,fill=200); sh=sh.filter(ImageFilter.GaussianBlur(28))
im.paste(Image.new('RGB',(W,H),(5,2,15)),(0,0),sh)
dr=ImageDraw.Draw(im)
dr.rounded_rectangle([sx-12,sy-12,sx+ph_w+12,sy+ph_h+12],radius=50,fill=(18,14,34),outline=(140,110,220),width=4)
scr=shot.resize((ph_w,ph_h),Image.LANCZOS); m=Image.new('L',scr.size,0); ImageDraw.Draw(m).rounded_rectangle([0,0,ph_w-1,ph_h-1],radius=38,fill=255)
im.paste(scr,(sx,sy),m)
F=lambda s:ImageFont.truetype(R.F_BOLD,s)
dr.text((70,150),"Wer",font=F(150),fill=R.WHITE)
dr.text((70,300),"blufft?",font=F(150),fill=(255,107,157))
icon=Image.open(R.ICON).convert('RGBA').resize((90,90)); mm=Image.new('L',(90,90),0); ImageDraw.Draw(mm).rounded_rectangle([0,0,89,89],radius=21,fill=255)
im.paste(icon,(72,500),mm)
dr.text((180,545),"SneakPlay",font=F(56),fill=R.WHITE,anchor="lm")
dr.text((72,620),"Partyspiel für Freizeit & Schule",font=ImageFont.truetype(R.F_SEMI,38),fill=R.GOLD)
im.save('out/youtube-thumbnail.png')
