import type { Metadata } from "next";
import Link from "next/link";
import { Assistant, Secular_One } from "next/font/google";
import { repo } from "@/lib/repo";
import { signOut } from "./actions";
import { Nav } from "@/components/Nav";
import "./globals.css";

const body = Assistant({ variable: "--font-body", subsets: ["hebrew", "latin"] });
const display = Secular_One({ variable: "--font-display", weight: "400", subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "Parkit · חניות פרטיות לפי שעה",
  description: "השכירו את החניה שלכם בשעות שהיא ריקה, או מצאו חניה פרטית בתל אביב.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await repo.currentUser();
  return (
    <html lang="he" dir="rtl">
      <body className={`${body.variable} ${display.variable}`}>
        <div className="wrap">
          <header className="topbar">
            <Link href="/" className="brand">
              <div className="logo">P</div>
              <span>Parkit</span>
            </Link>
            {repo.mode === "demo" ? (
              <span className="meta">מצב הדגמה · הנתונים מתאפסים בכל הפעלה</span>
            ) : user ? (
              <form action={signOut}>
                <span className="meta">{user.email} · </span>
                <button className="ghost" type="submit">התנתקות</button>
              </form>
            ) : (
              <Link className="ghost" href="/login">כניסה</Link>
            )}
          </header>
          <div className="curb" aria-hidden="true" />
          <Nav />
          {children}
        </div>
      </body>
    </html>
  );
}
