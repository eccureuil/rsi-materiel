import type { Evenement, TypeEvenement } from '@/types/historique';

interface Config {
  couleur: string;
  bg: string;
  texte: string;
  icone: React.ReactNode;
  titre: string;
}

const CONFIG: Record<TypeEvenement, Config> = {
  ACQUISITION: {
    couleur: 'bg-blue-500',
    bg: 'bg-blue-50',
    texte: 'text-blue-800',
    titre: 'Acquisition',
    icone: <IconeBoite />,
  },
  MOUVEMENT: {
    couleur: 'bg-asecna-bleu',
    bg: 'bg-slate-50',
    texte: 'text-slate-800',
    titre: 'Mouvement',
    icone: <IconeFleche />,
  },
  INCIDENT: {
    couleur: 'bg-amber-500',
    bg: 'bg-amber-50',
    texte: 'text-amber-800',
    titre: 'Panne declaree',
    icone: <IconeAlerte />,
  },
  INTERVENTION_DEBUT: {
    couleur: 'bg-indigo-500',
    bg: 'bg-indigo-50',
    texte: 'text-indigo-800',
    titre: 'Debut d\'intervention',
    icone: <IconeOutil />,
  },
  PIECE_UTILISEE: {
    couleur: 'bg-purple-500',
    bg: 'bg-purple-50',
    texte: 'text-purple-800',
    titre: 'Piece utilisee',
    icone: <IconePiece />,
  },
  INTERVENTION_FIN: {
    couleur: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    texte: 'text-emerald-800',
    titre: 'Fin d\'intervention',
    icone: <IconeCoche />,
  },
};

// Helpers typés pour extraire les champs du details
function str(details: Record<string, string | number | null>, cle: string): string | null {
  const v = details[cle];
  return v === null || v === undefined ? null : String(v);
}

function localisationLabel(nom: string | null, bureau: string | null, ville: string | null): string {
  return `${nom ?? '-'}${bureau ? ` (${bureau})` : ''}${ville ? ` - ${ville}` : ''}`;
}

function dateAffichee(evenement: Evenement): string {
  const [datePart, heure] = evenement.date_evenement.split(' ');
  const [annee, mois, jour] = datePart.split('-');
  const dateFr = annee && mois && jour ? `${jour}-${mois}-${annee}` : datePart;
  if (evenement.type_evenement === 'ACQUISITION') return dateFr;
  return heure ? `${dateFr} ${heure}` : dateFr;
}

export default function TimelineEvenement({ evenement }: { evenement: Evenement }) {
  const c = CONFIG[evenement.type_evenement];
  return (
    <li className="relative rsi-slide-in">
      <span className={`absolute -left-[21px] top-3 h-3 w-3 rounded-full ring-2 ring-white ${c.couleur}`} />
      <div className={`rounded-md p-3 text-sm ${c.bg}`}>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-white/70 ${c.texte}`}>
            {c.icone}
          </span>
          <span className={`text-sm font-semibold ${c.texte}`}>{c.titre}</span>
          <span className="text-xs text-slate-500">{dateAffichee(evenement)}</span>
          {evenement.reference && (
            <span className="ml-auto rounded bg-white/70 px-2 py-0.5 font-mono text-xs text-slate-600">
              {evenement.reference}
            </span>
          )}
        </div>
        <Details evenement={evenement} />
      </div>
    </li>
  );
}

function Details({ evenement }: { evenement: Evenement }) {
  const d = evenement.details;
  switch (evenement.type_evenement) {
    case 'ACQUISITION': {
      const marque = str(d, 'marque');
      const modele = str(d, 'modele');
      const serie = str(d, 'num_serie');
      const origine = str(d, 'localisation_origine');
      const origineBureau = str(d, 'origine_code_bureau');
      const origineVille = str(d, 'origine_ville');
      return (
        <div className="space-y-1 text-xs text-slate-700">
          <p>
            {marque ?? 'INCONNU'} {modele ?? ''}{serie ? ` - N° serie ${serie}` : ''}
          </p>
          {origine && <p>Localisation d'origine : {localisationLabel(origine, origineBureau, origineVille)}</p>}
        </div>
      );
    }
    case 'MOUVEMENT': {
      const type = str(d, 'type_mouvement');
      const agent = str(d, 'agent_beneficiaire');
      const localisation = str(d, 'localisation');
      const bureau = str(d, 'code_bureau');
      const ville = str(d, 'ville');
      const origine = str(d, 'origine_localisation');
      const origineBureau = str(d, 'origine_code_bureau');
      const origineVille = str(d, 'origine_ville');
      const motif = str(d, 'motif_mouvement');
      return (
        <div className="space-y-1 text-xs text-slate-700">
          <p>
            <span className="font-medium">{type ?? 'MOUVEMENT'}</span>
            {agent ? ` - récepteur : ${agent}` : ''}
          </p>
          <p>Origine : {origine ? localisationLabel(origine, origineBureau, origineVille) : '-'}</p>
          <p>Destination : {localisation ? localisationLabel(localisation, bureau, ville) : '-'}</p>
          {motif && <p className="italic text-slate-600">Motif : {motif}</p>}
        </div>
      );
    }
    case 'INCIDENT': {
      const urgence = str(d, 'degre_urgence');
      const statut = str(d, 'statut_incident');
      const symptomes = str(d, 'symptomes');
      const declarant = str(d, 'declarant');
      return (
        <div className="space-y-1 text-xs text-slate-700">
          <p>
            Urgence <span className="font-medium">{urgence ?? '-'}</span> - statut <span className="font-medium">{statut ?? '-'}</span>
            {declarant ? ` - declare par ${declarant}` : ''}
          </p>
          {symptomes && <p className="italic text-slate-600">{symptomes}</p>}
        </div>
      );
    }
    case 'INTERVENTION_DEBUT': {
      const type = str(d, 'type_maintenance');
      const numIncident = str(d, 'num_incident');
      const intervenants = str(d, 'intervenants');
      return (
        <div className="space-y-1 text-xs text-slate-700">
          <p>
            Maintenance <span className="font-medium">{type ?? '-'}</span>
            {numIncident ? ` - incident ${numIncident}` : ''}
          </p>
          {intervenants && <p>Intervenants : {intervenants}</p>}
        </div>
      );
    }
    case 'PIECE_UTILISEE': {
      const designation = str(d, 'designation');
      const qte = str(d, 'quantite_utilisee');
      const numInter = str(d, 'num_intervention');
      return (
        <p className="text-xs text-slate-700">
          {qte ?? '1'} x {designation ?? evenement.reference ?? '-'}
          {numInter ? ` (fiche ${numInter})` : ''}
        </p>
      );
    }
    case 'INTERVENTION_FIN': {
      const statut = str(d, 'statut_final_materiel');
      const diag = str(d, 'diagnostic');
      const travaux = str(d, 'travaux_realises');
      const duree = str(d, 'duree_heures');
      return (
        <div className="space-y-1 text-xs text-slate-700">
          <p>
            Statut final <span className="font-medium">{statut ?? '-'}</span>
            {duree ? ` - duree ${duree} h` : ''}
          </p>
          {diag && <p>Diagnostic : {diag}</p>}
          {travaux && <p>Travaux : {travaux}</p>}
        </div>
      );
    }
  }
}

function IconeBoite() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}
function IconeFleche() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function IconeAlerte() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
function IconeOutil() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M14.7 6.3a4 4 0 1 0 5 5l-9.4 9.4a2 2 0 1 1-2.8-2.8z" />
    </svg>
  );
}
function IconePiece() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </svg>
  );
}
function IconeCoche() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}