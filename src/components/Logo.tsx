
import Link from 'next/link';
import Image from 'next/image';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="CollectoRoom Home">
      <Image 
        src="/images/CR_Logo_Gry.png" 
        alt="CollectoRoom Logo" 
        width={32} 
        height={32} 
      />
      <span className="text-[25px] font-bold tracking-tight">
        <span className="text-primary">Collecto</span>
        <span className="text-accent">Room</span>
      </span>
    </Link>
  );
}
