import { Component } from "@angular/core";


@Component({
    selector: 'nutrionnals-values',
    templateUrl: './nutrionnals-values.html',
    styles: '',
    imports: []
})
export class NutrionnalsValues {

    public readonly urlPnns = 'https://www.mangerbouger.fr/ressources-pros/le-programme-national-nutrition-sante-pnns'
    public readonly urlOms = 'https://www.who.int/fr/news-room/fact-sheets/detail/healthy-diet'
    public readonly urlVioletDiet = "https://www.instagram.com/violette.diet?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
    public readonly urlPaulinebudynski = "https://www.instagram.com/paulinebudynski_dieteticienne?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw%3D%3D"
    public readonly urlClaireHappydiet = "https://www.instagram.com/claire.happydiet?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw%3D%3D"
    public readonly urlClemleDiet = "https://www.instagram.com/clem_le_diet?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw%3D%3D"

}
