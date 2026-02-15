package database

import (
	"backend/internal/models"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/google/uuid"
)

func SeedData() {
	var count int
	DB.QueryRow("SELECT COUNT(*) FROM questions").Scan(&count)
	if count > 0 {
		return
	}

	fmt.Println("Seeding Questions and Tests...")
	var questions []models.Question
	filename := "questions.json"
	if data, err := os.ReadFile(filename); err == nil {
		if err := json.Unmarshal(data, &questions); err != nil {
			log.Printf("Error unmarshalling questions.json: %v", err)
			return
		}
	} else {
		log.Printf("Error reading questions.json: %v", err)
		return
	}

	if len(questions) == 0 {
		fmt.Println("No questions to seed.")
		return
	}

	questionsPerTest := 100
	currentTestID := ""

	for i, q := range questions {
		if i%questionsPerTest == 0 {
			testNum := (i / questionsPerTest) + 1
			testID, _ := uuid.NewV7()
			currentTestID = testID.String()
			_, _ = DB.Exec("INSERT INTO tests (id, title, description) VALUES ($1, $2, $3)",
				currentTestID, fmt.Sprintf("Deneme Sınavı %d", testNum), "Genel Yetenek ve Alan Bilgisi")
		}

		qID, _ := uuid.NewV7()
		optionsJson, _ := json.Marshal(q.Options)
		solutionJson, _ := json.Marshal(q.Solution)
		metadataJson, _ := json.Marshal(q.Metadata)

		_, err := DB.Exec(`INSERT INTO questions 
            (id, test_id, question_id, category, subject, topic, sub_topic, difficulty, skill_level, text, options, solution, metadata, image_url, related_concept_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
			qID.String(), currentTestID, q.QuestionID, q.Category, q.Subject, q.Topic, q.SubTopic, q.Difficulty, q.SkillLevel, q.Text, optionsJson, solutionJson, metadataJson, q.ImageURL, q.RelatedConceptID)

		if err != nil {
			log.Printf("Error inserting question %s: %v", q.QuestionID, err)
		}
	}
}

func SeedSubjects() {
	var count int
	DB.QueryRow("SELECT COUNT(*) FROM subjects").Scan(&count)
	if count > 0 {
		return
	}

	fmt.Println("Seeding Subjects...")

	type SeedSubject struct {
		Title    string
		Weight   string
		Category string
		Content  string
	}

	subjects := []SeedSubject{
		{"Zihin Yetersizliği ve Otizm Spektrum Bozukluğu", "%10", "bilgi", `• Zihin Yetersizliği
Zihin yetersizliği, 18 yaşından önce ortaya çıkan, hem zihinsel işlevlerde hem de kavramsal, sosyal ve pratik uyum becerilerinde önemli sınırlılıklarla karakterize edilen bir yetersizlik durumudur.

- IQ Sınırı: Genellikle 70 ve altı olarak kabul edilir.
- Sınıflandırma: Hafif, orta, ağır ve çok ağır olarak gruplandırılır.

• Otizm Spektrum Bozukluğu (OSB)
OSB, belirtileri yaşamın ilk yıllarında ortaya çıkan, sosyal etkileşim ve iletişimde sınırlılıklar ile yinelenen davranışlar ve kısıtlı ilgi alanları ile kendini gösteren nörogelişimsel bir bozukluktur.

- Temel Belirtiler: Göz teması kuramama, ortak dikkat eksikliği, rutinlere aşırı bağlılık.
- Eğitim: Erken yoğun davranışsal eğitim (ABA) en etkili yöntemlerden biridir.`},
		{"Öğrenme Güçlüğü ve Özel Yetenek", "%6", "bilgi", ""},
		{"İşitme ve Görme Yetersizliği", "%10", "bilgi", ""},
		{"Erken Çocuklukta Özel Eğitim", "%4", "bilgi", ""},
		{"Uygulamalı Davranış Analizi", "%8", "bilgi", ""},
		{"Bireyselleştirilmiş Eğitim Programları", "%6", "bilgi", ""},
		{"Özel Eğitimde Değerlendirme", "%6", "bilgi", ""},
		{"Dil ve İletişim Becerilerinin Desteknenmesi", "%4", "bilgi", ""},
		{"Özel Eğitim Politikaları ve Yasal Düzenlemeler", "%6", "bilgi", ""},
		{"2024 TYMM Özel Eğitim Programları", "%4", "egitim", `• Türkiye Yüzyılı Maarif Modeli (2024)
2024 yılında hayata geçirilen TYMM, özel eğitim öğrencileri için "beceri temelli" ve "değer odaklı" bir yaklaşım sunmaktadır.

- Bütüncül Yaklaşım: Öğrencinin sadece akademik değil, sosyal, duygusal ve fiziksel gelişimi de hedeflenir.
- Eğitsel Çerçeve: Programlar, öğrencilerin bireysel hızlarına ve gereksinimlerine göre esnetilebilir yapıdadır.
- Dijital Dönüşüm: Özel eğitim materyallerinin dijitalleşmesi ve erişilebilirliği ön plandadır.
- BEP Uyumu: Türkiye Yüzyılı Maarif Modeli, Bireyselleşmiş Eğitim Programları (BEP) ile tam uyumlu çalışacak şekilde tasarlanmıştır.`},
		{"Özel Eğitimde Okuma-Yazma Öğretimi", "%4", "egitim", ""},
		{"Özel Eğitimde Fen ve Sosyal Bilgiler Öğretimi", "%4", "egitim", ""},
		{"Özel Eğitimde Matematik Öğretimi", "%4", "egitim", ""},
		{"Özel Eğitimde Sanatsal Becerilerin Öğretimi", "%4", "egitim", ""},
		{"Özel Eğitimde Fiziksel Eğitim ve Spor", "%4", "egitim", ""},
		{"Özel Eğitimde Sosyal Uyum Becerilerinin Öğretimi", "%4", "egitim", ""},
		{"Özel Eğitimde Türkçe Öğretimi", "%4", "egitim", ""},
		{"Özel Eğitimde Oyun ve Müzik", "%4", "egitim", ""},
		{"Özel Eğitimde Aile Eğitimi", "%4", "egitim", ""},
	}

	titleToID := make(map[string]string)

	for _, s := range subjects {
		id, _ := uuid.NewV7()
		_, err := DB.Exec("INSERT INTO subjects (id, title, weight, category, content) VALUES ($1, $2, $3, $4, $5)",
			id.String(), s.Title, s.Weight, s.Category, s.Content)
		if err != nil {
			log.Printf("Error seeding subject %s: %v", s.Title, err)
		}
		titleToID[s.Title] = id.String()
	}

	// Related Subjects Links
	relations := map[string][]string{
		"Zihin Yetersizliği ve Otizm Spektrum Bozukluğu": {"2024 TYMM Özel Eğitim Programları", "Uygulamalı Davranış Analizi"},
		"2024 TYMM Özel Eğitim Programları":              {"Zihin Yetersizliği ve Otizm Spektrum Bozukluğu", "Bireyselleştirilmiş Eğitim Programları"},
	}

	for srcTitle, relatedTitles := range relations {
		srcID := titleToID[srcTitle]
		for _, relTitle := range relatedTitles {
			relID, ok := titleToID[relTitle]
			if ok {
				_, _ = DB.Exec("INSERT INTO related_subjects (subject_id, related_subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", srcID, relID)
			}
		}
	}
}
