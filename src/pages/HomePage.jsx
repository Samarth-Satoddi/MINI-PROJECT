import EventSection from "../components/EventSection";
import Hero from "../components/Hero";

function HomePage({ providers }) {
    return (
        <main className="home-page">
            <Hero
                title="Good local help. Booked simply."
                description="Find an electrician, a tutor, a cleaner, or the right person for the job. Compare verified profiles, check real availability, and request a time that suits you."
            />
            <div className="directory-wrap">
                <EventSection providers={providers} />
            </div>
        </main>
    );
}

export default HomePage;