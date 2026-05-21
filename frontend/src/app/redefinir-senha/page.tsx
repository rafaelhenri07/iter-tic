import DefinirSenhaPage from "@/components/auth/DefinirSenhaPage";

export default function RedefinirSenhaPage() {
  return (
    <DefinirSenhaPage
      titulo="Redefinir Senha"
      subtitulo="Crie uma nova senha para acessar o sistema"
      icon="key"
      successMessage="Senha redefinida com sucesso! Você já pode fazer login com sua nova senha."
    />
  );
}
