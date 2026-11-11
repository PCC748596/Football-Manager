#!/bin/sh
# Corre os testes do 3D um arquivo de cada vez, com limite de tempo por arquivo (um arquivo que trava nao para os outros).
# Uso (na pasta 3dMatch/simulador3d):  sh tools/headless/suite_por_arquivo.sh [segundos por arquivo, 240] [a partir do n-esimo arquivo, 1]
# Saida: tools/headless/saida/suite_por_arquivo.txt  (OK / FALHA / TEMPO por arquivo)
LIM=${1:-240}
DE=${2:-1}
OUT=tools/headless/saida/suite_por_arquivo.txt
: > "$OUT"
n=0
for f in tests/*.test.js; do
  n=$((n+1))
  [ "$n" -lt "$DE" ] && continue
  saida=$(timeout "$LIM" node --test --test-force-exit "$f" 2>&1); cod=$?
  if [ $cod -eq 124 ]; then echo "TEMPO $f" >> "$OUT"
  elif echo "$saida" | grep -q "^# fail 0"; then echo "OK    $f" >> "$OUT"
  else echo "FALHA $f :: $(echo "$saida" | grep -E '^not ok|  X ' | grep -v "not ok 1 - tests" | head -3 | tr '\n' ' ' | cut -c1-300)" >> "$OUT"
  fi
done
echo "FIM" >> "$OUT"
