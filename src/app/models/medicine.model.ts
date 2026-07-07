/**
 * A differenza degli altri servizi esterni, la ricerca medicinali (AIFA) non segue il
 * formato uniforme title/subtitle/image_url/service_url/metadata: è un indice locale
 * (nessuna immagine, nessuna pagina di servizio) e restituisce direttamente i campi
 * del tipo 'medicine'.
 */
export interface MedicineResult {
  aic_code: string;
  name: string;
  active_ingredient: string;
  atc_code: string;
  marketing_authorization_holder: string;
  pharmaceutical_form: string;
  pack_description: string;
  prescription_requirement: string;
}
