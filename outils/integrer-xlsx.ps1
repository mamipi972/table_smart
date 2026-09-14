<#
  Fabrique une page autonome : la librairie SheetJS est recopiee dans le HTML,
  a la place de la balise <script src="xlsx.full.min.js">.

  Equivalent PowerShell de outils/integrer-xlsx.js, pour Windows sans Node.

    .\outils\integrer-xlsx.ps1
    .\outils\integrer-xlsx.ps1 -Lib "$HOME\Downloads\xlsx.full.min.js"
    .\outils\integrer-xlsx.ps1 -Lib C:\chemin\xlsx.full.min.js -Sortie C:\chemin\tableur-autonome.html

  Se lance depuis le dossier du projet. Si Windows refuse d'executer le script,
  autorisez-le pour cette session seulement :
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

  Ce fichier est enregistre en UTF-8 avec BOM : sans lui, Windows PowerShell 5.1
  lirait les accents de travers.
#>
param(
  [string]$Source,
  [string]$Lib,
  [string]$Sortie
)

$ErrorActionPreference = 'Stop'

function Echec([string]$message) {
  Write-Host "Échec : $message" -ForegroundColor Red
  exit 1
}
function Absolu([string]$chemin) {
  if ([System.IO.Path]::IsPathRooted($chemin)) { return $chemin }
  return (Join-Path (Get-Location).Path $chemin)
}

$racine = Split-Path -Parent $PSScriptRoot
if (-not $Source) { $Source = Join-Path $racine 'tableur.html' }
if (-not $Lib)    { $Lib    = Join-Path $racine 'xlsx.full.min.js' }
if (-not $Sortie) { $Sortie = Join-Path $racine 'tableur-autonome.html' }
$Source = Absolu $Source
$Lib    = Absolu $Lib
$Sortie = Absolu $Sortie

if (-not (Test-Path -LiteralPath $Source)) { Echec "page introuvable : $Source" }
if (-not (Test-Path -LiteralPath $Lib)) {
  Echec "librairie introuvable : $Lib`nTéléchargez xlsx.full.min.js (SheetJS) et indiquez son chemin avec -Lib."
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
$html = [System.IO.File]::ReadAllText($Source, $utf8)
$code = [System.IO.File]::ReadAllText($Lib, $utf8)
if ($code.Length -gt 0 -and [int][char]$code[0] -eq 0xFEFF) { $code = $code.Substring(1) }

$DEBUT = '<!-- DEBUT chargement de la librairie -->'
$FIN   = '<!-- FIN chargement de la librairie -->'
$debut = $html.IndexOf($DEBUT)
$fin   = $html.IndexOf($FIN)
if ($debut -lt 0 -or $fin -lt 0 -or $fin -lt $debut) {
  Echec "les repères de chargement sont absents de $(Split-Path -Leaf $Source).`nCette page a-t-elle déjà été fabriquée par cet outil ?"
}

# Une occurrence de « </script » fermerait la balise par accident.
$fermetures = ([regex]::Matches($code, '</script', 'IgnoreCase')).Count
if ($fermetures -gt 0) { $code = [regex]::Replace($code, '</script', '<\/script', 'IgnoreCase') }

# « --> » en début de ligne serait lu comme un commentaire une fois intégré.
$suspects = ([regex]::Matches($code, '(?m)^\s*-->')).Count
if ($suspects -gt 0) {
  Echec "la librairie contient une ligne commençant par « --> », qui serait lue comme un commentaire une fois intégrée. Intégration abandonnée."
}
$commentaires = ([regex]::Matches($code, '<!--')).Count

$version = 'version inconnue'
$m = [regex]::Match($code, 'version\s*=\s*[''"](\d+\.\d+\.\d+)[''"]')
if ($m.Success) { $version = $m.Groups[1].Value }

$date = (Get-Date).ToString('yyyy-MM-dd')
$entete = "<script>`n" +
  "  /* Librairie SheetJS $version intégrée le $date`n" +
  "     par outils/integrer-xlsx.ps1. Cette page ne charge aucun fichier extérieur. */`n" +
  "  window.__xlsxInline = true;`n" +
  "  window.__xlsxLoadError = false;`n" +
  "  function xlsxMissing() { window.__xlsxLoadError = true; }`n" +
  "</script>`n"
$remplacement = $DEBUT + "`n" + $entete + "<script>`n" + $code + "`n</script>`n" + $FIN
$resultat = $html.Substring(0, $debut) + $remplacement + $html.Substring($fin + $FIN.Length)

[System.IO.File]::WriteAllText($Sortie, $resultat, $utf8)

function Ko([int]$n) { return ('{0} Ko' -f [math]::Round($n / 1024)) }
Write-Host "SheetJS $version intégré dans $Sortie"
Write-Host ("  page seule      : " + (Ko $utf8.GetByteCount($html)))
Write-Host ("  librairie       : " + (Ko $utf8.GetByteCount($code)))
Write-Host ("  page autonome   : " + (Ko $utf8.GetByteCount($resultat)))
if ($fermetures -gt 0) { Write-Host "  $fermetures occurrence(s) de « </script » échappée(s)" }
if ($commentaires -gt 0) { Write-Host "  $commentaires occurrence(s) de « <!-- » laissée(s) telles quelles (en milieu de ligne, donc inertes)" }
Write-Host "`nVérifiez la page une fois dans le navigateur : import, export, puis rechargement."
