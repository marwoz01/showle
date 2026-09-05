export const clerkPl = {
  locale: "pl-PL",
  socialButtonsBlockButton: "Kontynuuj z {{provider|titleize}}",
  dividerText: "lub",
  formFieldLabel__emailAddress: "Adres e-mail",
  formFieldLabel__emailAddress_username: "Adres e-mail lub nazwa użytkownika",
  formFieldLabel__username: "Nazwa użytkownika",
  formFieldLabel__password: "Hasło",
  formFieldLabel__confirmPassword: "Potwierdź hasło",
  formFieldLabel__firstName: "Imię",
  formFieldLabel__lastName: "Nazwisko",
  formFieldAction__forgotPassword: "Nie pamiętasz hasła?",
  formButtonPrimary: "Kontynuuj",
  formButtonPrimary__verify: "Potwierdź",
  backButton: "Wstecz",
  signIn: {
    start: {
      title: "Zaloguj się do Showle",
      subtitle: "Witaj ponownie! Zaloguj się, aby kontynuować.",
      actionText: "Nie masz konta?",
      actionLink: "Zarejestruj się",
    },
    password: {
      title: "Wpisz hasło",
      subtitle: "Użyj hasła przypisanego do swojego konta.",
      actionLink: "Użyj innej metody",
    },
    forgotPassword: {
      title: "Zresetuj hasło",
      subtitle: "Otrzymasz kod umożliwiający ustawienie nowego hasła.",
      formTitle: "Kod weryfikacyjny",
      resendButton: "Wyślij kod ponownie",
    },
    emailCode: {
      title: "Sprawdź pocztę",
      subtitle: "Wpisz kod wysłany na Twój adres e-mail.",
      formTitle: "Kod weryfikacyjny",
      resendButton: "Wyślij kod ponownie",
    },
  },
  signUp: {
    start: {
      title: "Utwórz konto w Showle",
      subtitle: "Zarejestruj się, aby zapisywać wyniki i kolekcję.",
      actionText: "Masz już konto?",
      actionLink: "Zaloguj się",
    },
    continue: {
      title: "Uzupełnij dane",
      subtitle: "Potrzebujemy jeszcze kilku informacji.",
      actionText: "Masz już konto?",
      actionLink: "Zaloguj się",
    },
    emailCode: {
      title: "Sprawdź pocztę",
      subtitle: "Wpisz kod wysłany na Twój adres e-mail.",
      formTitle: "Kod weryfikacyjny",
      formSubtitle: "Kod jest ważny przez ograniczony czas.",
      resendButton: "Wyślij kod ponownie",
    },
  },
} as const;

export const clerkEn = { locale: "en-US" } as const;
