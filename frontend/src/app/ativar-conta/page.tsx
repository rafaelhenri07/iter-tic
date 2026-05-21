import DefinirSenhaPage from "@/components/auth/DefinirSenhaPage";

export default function AtivarContaPage() {
  return (
    <DefinirSenhaPage
      titulo="Ativar Conta"
      subtitulo="Defina sua senha para ativar o acesso ao sistema"
      icon="shield"
      successMessage="Conta ativada com sucesso! Você já pode fazer login com sua matrícula e senha."
    />
  );
}
