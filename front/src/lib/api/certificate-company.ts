import { API_URL } from '../config/config';
import { authFetch } from './authFetch';

export interface IssuingCompany {
  id?: number;
  name: string;
  cnpj: string;
  signatory_name: string;
  signatory_role: string;
  certificate_text: string;
}

export async function getIssuingCompany(): Promise<IssuingCompany | null> {
  const response = await authFetch(`${API_URL}/api/v1/issuing-company/`);
  if (!response.ok) throw new Error('Não foi possível carregar a empresa emissora.');
  const data = await response.json();
  return data.configured === false ? null : data;
}

export async function saveIssuingCompany(company: IssuingCompany): Promise<IssuingCompany> {
  const response = await authFetch(`${API_URL}/api/v1/issuing-company/`, {method: 'PUT', body: JSON.stringify(company)});
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || Object.values(error).flat().join(' ') || 'Não foi possível salvar a empresa.');
  }
  return response.json();
}

export interface ValidatedCertificate {
  valid: boolean;
  validation_code: string;
  student_name: string;
  course_name: string;
  workload_hours: number;
  issued_at: string;
  company_name: string;
  company_cnpj: string;
}

export async function validateCertificate(code: string): Promise<ValidatedCertificate> {
  const response = await fetch(`${API_URL}/api/v1/certificates/validate/${encodeURIComponent(code.trim())}/`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Não foi possível validar o certificado. Tente novamente.');
  }
  return response.json();
}
