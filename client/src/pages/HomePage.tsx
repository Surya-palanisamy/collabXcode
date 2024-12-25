import FormComponent from "@/components/forms/FormComponent";
import Footer from "@/components/common/Footer";
function HomePage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-16 lg:h-screen lg:overflow-hidden">            
            <div className="my-12 flex h-full min-w-full flex-col items-center justify-evenly sm:flex-row sm:pt-0">
                <div className="flex w-full items-center justify-center sm:w-ful ">
                    <FormComponent />
                </div>
            </div>
            <Footer />
        </div>
    );
}
export default HomePage;