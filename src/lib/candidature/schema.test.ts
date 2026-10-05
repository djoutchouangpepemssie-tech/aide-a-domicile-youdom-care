import { describe, expect, it } from "vitest";
import {
  candidatureSchema,
  checkCvFile,
  CV_MAX_BYTES,
  cvKindFromName,
  cvKindFromSignature,
  formatFileSize,
  safeCvFilename,
} from "./schema";

const pdfHead = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
const zipHead = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

describe("contrôle du CV (docs/05 §2 : PDF ou DOCX, 4 Mo au plus)", () => {
  it("accepte un PDF et un DOCX cohérents (nom, type, signature)", () => {
    expect(
      checkCvFile({ name: "CV Claire.pdf", type: "application/pdf", size: 120_000, head: pdfHead }),
    ).toEqual({ ok: true, kind: "pdf", reason: null });
    expect(
      checkCvFile({
        name: "cv.DOCX",
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 40_000,
        head: zipHead,
      }),
    ).toEqual({ ok: true, kind: "docx", reason: null });
    // Type MIME vide ou générique (certains navigateurs) : l'extension et la signature tranchent.
    expect(checkCvFile({ name: "cv.pdf", type: "", size: 10, head: pdfHead }).ok).toBe(true);
    expect(
      checkCvFile({ name: "cv.pdf", type: "application/octet-stream", size: 10, head: pdfHead }).ok,
    ).toBe(true);
  });

  it("refuse un fichier absent ou vide", () => {
    expect(checkCvFile(null).reason).toBe("manquant");
    expect(
      checkCvFile({ name: "cv.pdf", type: "application/pdf", size: 0, head: pdfHead }).reason,
    ).toBe("manquant");
  });

  it("refuse un fichier de plus de 4 Mo", () => {
    const check = checkCvFile({
      name: "cv.pdf",
      type: "application/pdf",
      size: CV_MAX_BYTES + 1,
      head: pdfHead,
    });
    expect(check).toEqual({ ok: false, kind: null, reason: "trop_lourd" });
    expect(
      checkCvFile({ name: "cv.pdf", type: "application/pdf", size: CV_MAX_BYTES, head: pdfHead })
        .ok,
    ).toBe(true);
  });

  it("refuse une mauvaise extension ou un type MIME qui ne correspond pas", () => {
    expect(
      checkCvFile({ name: "cv.exe", type: "application/pdf", size: 10, head: pdfHead }).reason,
    ).toBe("type_invalide");
    expect(
      checkCvFile({ name: "cv.doc", type: "application/msword", size: 10, head: zipHead }).reason,
    ).toBe("type_invalide");
    expect(checkCvFile({ name: "cv.pdf", type: "image/png", size: 10, head: pdfHead }).reason).toBe(
      "type_invalide",
    );
  });

  it("refuse un fichier renommé dont la signature ne correspond pas", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    expect(
      checkCvFile({ name: "cv.pdf", type: "application/pdf", size: 10, head: png }).reason,
    ).toBe("type_invalide");
    // Un zip renommé en .pdf, un PDF renommé en .docx.
    expect(
      checkCvFile({ name: "cv.pdf", type: "application/pdf", size: 10, head: zipHead }).reason,
    ).toBe("type_invalide");
    expect(checkCvFile({ name: "cv.docx", type: "", size: 10, head: pdfHead }).reason).toBe(
      "type_invalide",
    );
    expect(
      checkCvFile({ name: "cv.pdf", type: "", size: 10, head: new Uint8Array(2) }).reason,
    ).toBe("type_invalide");
  });

  it("déduit le type du nom et de la signature", () => {
    expect(cvKindFromName("Mon CV.PDF")).toBe("pdf");
    expect(cvKindFromName("cv.docx")).toBe("docx");
    expect(cvKindFromName("cv.odt")).toBeNull();
    expect(cvKindFromSignature(pdfHead)).toBe("pdf");
    expect(cvKindFromSignature(zipHead)).toBe("docx");
    expect(cvKindFromSignature(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });

  it("formate la taille et sécurise le nom de la pièce jointe", () => {
    expect(formatFileSize(340 * 1024)).toBe("340 Ko");
    expect(formatFileSize(1.25 * 1024 * 1024)).toBe("1,3 Mo");
    expect(safeCvFilename("CV Élise Durand (2026).pdf", "pdf")).toBe("CV-Elise-Durand-2026.pdf");
    expect(safeCvFilename("../../etc/passwd.docx", "docx")).toBe("etc-passwd.docx");
    expect(safeCvFilename("....pdf", "pdf")).toBe("cv.pdf");
  });
});

describe("schéma d'une candidature", () => {
  const valid = {
    id: "8f7b1d1e-2c3a-4b5c-9d6e-7f8a9b0c1d2e",
    createdAt: "2026-09-27T10:00:00.000Z",
    sourcePage: "/recrutement/postuler/",
    contact: {
      prenom: "Claire",
      nom: "Martin",
      telephone: "06 12 34 56 78",
      email: "claire@test.local",
    },
    departement: "92",
    disponibilite: "Dès maintenant",
    consentement: { accepte: true, date: "2026-09-27T10:00:00.000Z", version: "2026-09" },
  };

  it("accepte une candidature complète et refuse un consentement absent, un département hors zone, un champ inconnu", () => {
    expect(candidatureSchema.safeParse(valid).success).toBe(true);
    expect(
      candidatureSchema.safeParse({
        ...valid,
        consentement: { ...valid.consentement, accepte: false },
      }).success,
    ).toBe(false);
    expect(candidatureSchema.safeParse({ ...valid, departement: "69" }).success).toBe(false);
    expect(candidatureSchema.safeParse({ ...valid, sante: "diabète" }).success).toBe(false);
    expect(
      candidatureSchema.safeParse({ ...valid, contact: { ...valid.contact, telephone: "12" } })
        .success,
    ).toBe(false);
    expect(candidatureSchema.safeParse({ ...valid, sourcePage: "/recrutement/?x=1" }).success).toBe(
      false,
    );
  });
});
