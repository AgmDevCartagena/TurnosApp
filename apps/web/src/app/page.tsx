import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Gestión de Compras
          <span className="block text-primary">MARDIQUE</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Plataforma integral para la gestión del ciclo completo de compras.
          Solicitudes, aprobaciones, órdenes, proveedores e inventarios en un solo lugar.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/login"
            className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
