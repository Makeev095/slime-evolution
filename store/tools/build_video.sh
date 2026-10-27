#!/bin/sh
# Сборка роликов из кадров capture.cjs и надписей overlays.cjs.
#   store/tools/build_video.sh <ru|en|tr> <h|v> <кадры> <надписи> <папка_результата>
# Результат: promo_<h|v>.mp4 (27 с, геймплей) и ad_<h|v>.mp4 (~19 с, рекламный ролик с финальной заставкой).
L=$1; K=$2; FR=$3; OV=$4; OUT=$5
mkdir -p "$OUT"
if [ "$K" = "v" ]; then W=1080; H=1920; BASE="[0:v]pad=1080:1920:0:150:color=0x1a1040"; SZ=1080x1920; NAME=vertical_1080x1920
else W=1920; H=1080; BASE="[0:v]pad=1920:1080:0:150:color=0x1a1040"; SZ=1920x1080; NAME=horizontal_1920x1080; fi

# ---------- PROMO (геймплей, 27 с) ----------
STARTS="0 4.8 11 14.2 20"; ENDS="4.8 11 14.2 20 27"
INP=""; FILT="${BASE}[b0]"; i=0
for S in $STARTS; do
  E=$(echo $ENDS | cut -d' ' -f$((i+1))); D=$(echo "$E - $S" | bc -l); FO=$(echo "$D - 0.3" | bc -l)
  INP="$INP -loop 1 -framerate 30 -t $D -i $OV/ov_${L}_${K}_$i.png"
  FILT="$FILT;[$((i+2)):v]format=rgba,fade=t=in:st=0:d=0.3:alpha=1,fade=t=out:st=$FO:d=0.3:alpha=1,setpts=PTS+$S/TB[o$i];[b$i][o$i]overlay=eof_action=pass[b$((i+1))]"
  i=$((i+1))
done
ffmpeg -y -loglevel error -framerate 30 -i "$FR/f%05d.jpg" -i "$FR/audio.wav" $INP \
  -filter_complex "$FILT" -map "[b5]" -map 1:a -af "afade=t=in:st=0:d=0.3,afade=t=out:st=25.8:d=1.2" \
  -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -r 30 -c:a aac -b:a 160k -t 27 -movflags +faststart "$OUT/promo_$NAME.mp4"

# ---------- AD (реклама ~19 с): тапы -> эволюция -> золотой пузырь -> заставка ----------
# куски геймплея: 1.0-9.8 и 14.2-19.2 с, затем заставка 5.2 с
A_S="0 4.4 8.8"; A_E="4.4 8.8 13.8"
INP=""; FILT="${BASE},split=2[a0][a1];[a0]trim=start=1:end=9.8,setpts=PTS-STARTPTS[v0];[a1]trim=start=14.2:end=19.2,setpts=PTS-STARTPTS[v1];[v0][v1]concat=n=2:v=1:a=0[b0]"
i=0
for S in $A_S; do
  E=$(echo $A_E | cut -d' ' -f$((i+1))); D=$(echo "$E - $S" | bc -l); FO=$(echo "$D - 0.25" | bc -l)
  INP="$INP -loop 1 -framerate 30 -t $D -i $OV/ad_ov_${L}_${K}_$i.png"
  FILT="$FILT;[$((i+2)):v]format=rgba,fade=t=in:st=0:d=0.25:alpha=1,fade=t=out:st=$FO:d=0.25:alpha=1,setpts=PTS+$S/TB[o$i];[b$i][o$i]overlay=eof_action=pass[b$((i+1))]"
  i=$((i+1))
done
INP="$INP -loop 1 -framerate 30 -t 5.7 -i $OV/ec_${L}_${K}.png"
FILT="$FILT;[b3]fps=30,format=yuv420p,settb=AVTB[g];[5:v]zoompan=z='min(1+0.0007*on,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${SZ}:fps=30,format=yuv420p,settb=AVTB[e];[g][e]xfade=transition=fade:duration=0.5:offset=13.3[v]"
FILT="$FILT;[1:a]asplit=3[x0][x1][x2];[x0]atrim=start=1:end=9.8,asetpts=PTS-STARTPTS[a_0];[x1]atrim=start=14.2:end=19.2,asetpts=PTS-STARTPTS[a_1];[x2]atrim=start=21.8:end=27,asetpts=PTS-STARTPTS[a_2];[a_0][a_1][a_2]concat=n=3:v=0:a=1,afade=t=in:st=0:d=0.3,afade=t=out:st=17.6:d=1.2[aa]"
ffmpeg -y -loglevel error -framerate 30 -i "$FR/f%05d.jpg" -i "$FR/audio.wav" $INP \
  -filter_complex "$FILT" -map "[v]" -map "[aa]" \
  -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -r 30 -c:a aac -b:a 160k -t 19 -movflags +faststart "$OUT/ad_$NAME.mp4"
echo "built $L $K"
