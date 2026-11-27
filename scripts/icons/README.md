# App icons

`make-icons.ts` draws every icon in `public/icons/` and `public/favicon.ico`:
a cinnabar seal (朱印) with 賢 carved out in white (白文).

```sh
node scripts/icons/make-icons.ts                 # write the icons
node scripts/icons/make-icons.ts --preview x.png # a sheet of every variant
```

The character is from **Noto Serif TC** (Black), subset to 賢 and 文 by Google
Fonts. Noto Serif TC is licensed under the SIL Open Font License 1.1, in
`OFL.txt`.
