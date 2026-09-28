require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8"]);

const mongoose = require("mongoose");
const Provider = require("./models/Provider");

const statesAndCities = [
    { state: "Karnataka", city: "Bangalore" },
    { state: "Maharashtra", city: "Mumbai" },
    { state: "Telangana", city: "Hyderabad" },
    { state: "Tamil Nadu", city: "Chennai" },
    { state: "Kerala", city: "Kochi" },
    { state: "Gujarat", city: "Ahmedabad" },
    { state: "Rajasthan", city: "Jaipur" },
    { state: "West Bengal", city: "Kolkata" },
    { state: "Uttar Pradesh", city: "Lucknow" },
    { state: "Andhra Pradesh", city: "Vijayawada" }
];

const serviceTemplates = {
    "Electrician": {
        names: [
            "Ramesh Rao Electricals", "Sachin Patil Wiring Works", "Srinivas Reddy Electricals",
            "Murugan Power Solutions", "Thomas Varghese Electrical", "Jignesh Patel Electric Works",
            "Surendra Sharma Electricals", "Debabrata Ghosh Power Works", "Akhilesh Yadav Electricals",
            "Venkatesh Naidu Electricals"
        ],
        hourlyRate: 350,
        services: ["Home Wiring", "Short Circuit Repair", "Ceiling Fan Installation", "MCB Fixing", "Light Fitting"],
        description: "Certified licensed electrician specializing in safe domestic and commercial wiring, installations, and fault repairs."
    },
    "Plumber": {
        names: [
            "Manjunath Plumbing Services", "Ganesh Kadam Plumbing", "Venkat Plumbing Solutions",
            "Karthik Selvam Plumbers", "George Mathew Plumbing", "Bharat Prajapati Plumbing Works",
            "Ramavatar Meena Plumbing", "Soumen Mukherjee Plumbers", "Pankaj Tiwari Plumbing Services",
            "Chaitanya Rao Plumbers"
        ],
        hourlyRate: 300,
        services: ["Leak Repairs", "Pipe Fitting", "Bathroom Fixtures", "Water Tank Cleaning", "Drain Unblocking"],
        description: "Experienced residential and commercial plumbing specialist handling pipe leaks, sanitary installations, and drainage repairs."
    },
    "Tutor": {
        names: [
            "Ananya Deshmukh Tutorials", "Prof. Kulkarni Mathematics", "Sri Chaitanya Tutors (Vani)",
            "Radha Krishnan Science Academy", "Deepa Nair Home Tuitions", "Hitesh Mehta Coaching",
            "Dr. Rajesh Verma Home Tuitions", "Anirban Sen Physics Classes", "Dr. Alok Srivastava Tutorials",
            "Padmavathi Learning Hub"
        ],
        hourlyRate: 500,
        services: ["Mathematics Coaching", "Physics Tuitions", "Chemistry Help", "CBSE & ICSE Prep", "Exam Strategy"],
        description: "Dedicated educator with 8+ years of teaching experience providing personalized 1-on-1 and small group academic tutoring."
    },
    "Cleaner": {
        names: [
            "CleanNest Bangalore (Shankar)", "Sparkle Mumbai Deep Cleaning", "Deccan Clean Pros (Naveen)",
            "Chennai Pristine Cleaners", "Cochin EcoClean Team", "Amdavad Clean Care (Dhaval)",
            "Pink City Deep Cleaners", "Bengal Shubhro Cleaning", "Avadh Spotless Home Care",
            "Krishna River Clean Pros"
        ],
        hourlyRate: 250,
        services: ["Deep Home Cleaning", "Sofa & Carpet Shampooing", "Kitchen Degreasing", "Bathroom Sanitization", "Floor Polishing"],
        description: "Professional cleaning team equipped with industrial eco-friendly chemicals and equipment for thorough sanitization."
    },
    "Carpenter": {
        names: [
            "Basavaraj Woodcraft Works", "Pandurang Shinde Carpentry", "Mallesh Carpentry Solutions",
            "Vignesh Wood Design", "Manoj Varma Wood Arts", "Kanti Mistry & Sons",
            "Bhairav Singh Woodworks", "Tapan Mistri Furniture Care", "Chandra Prakash Carpentry",
            "Sambaiah Wood Creations"
        ],
        hourlyRate: 400,
        services: ["Custom Furniture Making", "Door Lock Fitting", "Modular Kitchen Repairs", "Hinges & Handles", "Wood Polishing"],
        description: "Master carpenter offering bespoke woodwork, wardrobe repairs, modular kitchen adjustments, and antique restoration."
    },
    "Painter": {
        names: [
            "Rainbow Paints (Chandrashekar)", "Gaikwad Home Painting", "Nizam Wall Artistry (Syed)",
            "Marina Color Crafters", "Malabar Wall Finishes", "Shreeji Painting Services",
            "Rajputana Royal Paints", "Sonar Bangla Color Works", "Nawab City Painting Crew",
            "Amaravathi Interior Painters"
        ],
        hourlyRate: 300,
        services: ["Interior Wall Painting", "Exterior Weatherproof Paint", "Texture & Stencil Design", "Waterproofing", "Wood Staining"],
        description: "Professional interior and exterior painting services delivering premium smooth finishes, waterproofing, and texture walls."
    },
    "AC Technician": {
        names: [
            "CoolAir Bangalore (Kiran)", "Sahyadri Chill AC Solutions", "Telangana Air Cool Experts",
            "Coromandel Coolers (Arun)", "Kerala Cool Breeze Services", "Sabarmati AC Care (Nirav)",
            "Desert Breeze AC Services", "Howrah Cool Tech (Subhash)", "Ganga AC Service & Gas Filling",
            "Coastline AC Technicians"
        ],
        hourlyRate: 450,
        services: ["AC General Servicing", "Gas Refilling", "PCB Repair", "Uninstallation & Reinstallation", "Cooling Coil Cleaning"],
        description: "Certified HVAC and split/inverter AC specialist offering precision diagnostics, jet pump washing, and refrigerant refills."
    },
    "Appliance Repair": {
        names: [
            "QuickFix Appliances (Harish)", "Western Maharashtra Appliance Hub", "Deccan Appliance Doctors",
            "Kaveri Electronics & Appliances", "God's Own Appliance Care", "Gujarat Tech Appliance Solutions",
            "Jaipur Home Fixers (Mahesh)", "Kolkata Home ElectroCare", "Gomti Appliance Repairs",
            "Andhra Quick Appliance Repair"
        ],
        hourlyRate: 350,
        services: ["Refrigerator Repair", "Washing Machine Servicing", "Microwave Oven Repair", "Water Purifier Service", "Induction Hob Fix"],
        description: "Comprehensive multi-brand home appliance technician diagnosing electrical and mechanical breakdowns with genuine spare parts."
    },
    "Barber": {
        names: [
            "StyleCraft Men's Grooming (Prasad)", "Bollywood Looks (Imran Khan)", "Charminar Classic Barbers",
            "Royal Cuts Chennai (Vijay)", "Cochin Groom Studio (Faizal)", "Ahmedabad Smart Hair Studio",
            "Hawa Mahal Traditional Saloon", "Park Street Classic Barbers", "Hazratganj Royal Cuts (Wasim)",
            "Bhavani Hair Stylists (Kishore)"
        ],
        hourlyRate: 200,
        services: ["Modern Haircut", "Beard Styling & Trim", "Head Massage", "Hair Spa Treatment", "Traditional Hot Towel Shave"],
        description: "Expert barber and men's grooming professional offering tailored cuts, beard styling, and revitalizing head massage services."
    },
    "Gardener": {
        names: [
            "GreenThumb Landscapes (Suresh)", "Pavitra Green Spaces Mumbai", "Golconda Garden Care (Krishna)",
            "Semmozhi Greenery Works", "Periyar Organic Gardeners", "Prakriti Garden Maintainers",
            "Pink City Terrace Gardens", "Botanical Heritage Gardeners", "Awadh Flora & Garden Care",
            "Amaravathi Landscape Artists"
        ],
        hourlyRate: 250,
        services: ["Lawn Mowing & Care", "Plant Pruning & Trimming", "Balcony Garden Setup", "Organic Fertilizer Treatment", "Pest Control for Plants"],
        description: "Skilled horticulturist and urban gardener passionate about balcony green spaces, organic soil care, and healthy lush lawns."
    }
};

const serviceOrder = [
    "Electrician",
    "Plumber",
    "Tutor",
    "Cleaner",
    "Carpenter",
    "Painter",
    "AC Technician",
    "Appliance Repair",
    "Barber",
    "Gardener"
];

function generateAvailability(index) {
    const day1 = (10 + (index % 15)).toString().padStart(2, "0");
    const day2 = (11 + (index % 15)).toString().padStart(2, "0");
    const day3 = (12 + (index % 15)).toString().padStart(2, "0");

    return [
        { date: `2026-10-${day1}`, startTime: "09:00", endTime: "11:00", isAvailable: true },
        { date: `2026-10-${day2}`, startTime: "11:30", endTime: "13:30", isAvailable: true },
        { date: `2026-10-${day3}`, startTime: "15:00", endTime: "17:00", isAvailable: true }
    ];
}

async function seed() {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully to MongoDB Atlas!\n");

    const existingProvidersCount = await Provider.countDocuments();
    console.log(`Existing providers in database before seeding: ${existingProvidersCount}`);

    let totalPrepared = 0;
    let totalInserted = 0;
    let totalSkipped = 0;

    const providersToInsert = [];

    statesAndCities.forEach((sc, stateIndex) => {
        serviceOrder.forEach((serviceName) => {
            totalPrepared++;
            const template = serviceTemplates[serviceName];
            const providerName = template.names[stateIndex];

            // Deterministic unique phone and email
            const phonePrefix = (9800000000 + (stateIndex * 1000) + totalPrepared).toString();
            const emailSlug = providerName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
            const email = `${emailSlug}.${sc.city.toLowerCase()}@localservices.in`;

            const availabilitySlots = generateAvailability(totalPrepared);

            providersToInsert.push({
                name: providerName,
                category: serviceName,
                description: `${template.description} Serving clients across ${sc.city} and surrounding areas.`,
                location: sc.city,
                phone: phonePrefix,
                email: email,
                hourlyRate: template.hourlyRate + ((stateIndex % 3) * 20),
                services: template.services,
                verified: true,
                verificationStatus: "approved",
                availability: availabilitySlots
            });
        });
    });

    console.log(`Prepared ${providersToInsert.length} demo providers for 10 states.`);

    for (const p of providersToInsert) {
        // Prevent duplicates based on name, location, and category
        const exists = await Provider.findOne({
            name: p.name,
            location: p.location,
            category: p.category
        });

        if (!exists) {
            await Provider.create(p);
            totalInserted++;
        } else {
            totalSkipped++;
        }
    }

    console.log(`\n========================================`);
    console.log("Seed completed successfully.");
    console.log(`========================================`);
    console.log(`States:\n${statesAndCities.length}`);
    console.log(`\nProviders inserted:\n${totalInserted}`);
    console.log(`Providers skipped (already existed):\n${totalSkipped}`);
    console.log(`Expected total:\n100 new providers`);

    console.log(`\n--- VERIFICATION BY STATE & CITY ---`);
    for (const sc of statesAndCities) {
        const count = await Provider.countDocuments({ location: sc.city, verified: true });
        console.log(`${sc.state} (${sc.city}) → ${count}`);
    }

    console.log(`\n--- SERVICES BREAKDOWN IN EACH STATE ---`);
    console.log("Sample State (Karnataka - Bangalore):");
    for (const service of serviceOrder) {
        const c = await Provider.countDocuments({ location: "Bangalore", category: service });
        console.log(`  ${service} → ${c}`);
    }

    const grandTotal = await Provider.countDocuments();
    console.log(`\nTotal providers in database now: ${grandTotal}`);

    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
}

seed().catch(err => {
    console.error("Seeding error:", err);
    process.exit(1);
});
