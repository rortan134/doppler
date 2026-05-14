export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="mx-auto mt-20 max-w-xl border-t px-4 pt-10 pb-14">
            <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
                <p className="text-xs">
                    &copy; {year} Doppler. All rights reserved.
                </p>
                <p className="text-xs">Stateless end-to-end encryption</p>
            </div>
        </footer>
    );
}
