package database

import (
	"backend/internal/models"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

func SeedData() {
	fmt.Println("Checking for Questions and Tests to seed...")

	questionsDir := "data/questions"
	files, err := os.ReadDir(questionsDir)
	if err != nil {
		log.Printf("Error reading questions directory: %v", err)
		// Fallback to current directory for safety if data/questions doesn't exist
		questionsDir = "."
		files, _ = os.ReadDir(questionsDir)
	}

	totalInserted := 0
	for _, file := range files {
		if !file.IsDir() && (file.Name() == "questions.json" || (len(file.Name()) > 5 && file.Name()[len(file.Name())-5:] == ".json")) {
			filename := questionsDir + "/" + file.Name()
			fmt.Printf("Processing file: %s\n", filename)

			var fileQuestions []models.Question
			data, err := os.ReadFile(filename)
			if err != nil {
				log.Printf("Error reading file %s: %v", filename, err)
				continue
			}

			if err := json.Unmarshal(data, &fileQuestions); err != nil {
				log.Printf("Error unmarshalling %s: %v", filename, err)
				continue
			}

			if len(fileQuestions) == 0 {
				continue
			}

			fmt.Printf("File %s: Found %d questions in JSON\n", file.Name(), len(fileQuestions))

			questionsPerTest := 20
			currentTestID := ""
			newQuestionsInFile := 0
			for _, q := range fileQuestions {
				// Basic Validation
				if q.Text == "" || len(q.Options) == 0 {
					log.Printf("Skipping invalid question %s from %s (missing text or options)", q.QuestionID, file.Name())
					continue
				}

				// Check if question already exists in THIS category
				var existingID string
				categoryName := strings.Title(strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(strings.ReplaceAll(strings.TrimSuffix(file.Name(), filepath.Ext(file.Name())), " öabt sorular", ""), " ÖABT sorular", ""), " sorular", "")))

				err := DB.QueryRow("SELECT id FROM questions WHERE question_id = $1 AND category = $2", q.QuestionID, categoryName).Scan(&existingID)
				if err == nil {
					continue
				}

				// Switch to a new test ID every 20 questions
				if currentTestID == "" || newQuestionsInFile%questionsPerTest == 0 {
					category := categoryName
					testNum := (newQuestionsInFile / questionsPerTest) + 1
					testTitle := fmt.Sprintf("%s - Deneme %d", category, testNum)

					var testID string
					err := DB.QueryRow("SELECT id FROM tests WHERE title = $1", testTitle).Scan(&testID)
					if err != nil {
						newUUID, _ := uuid.NewV7()
						testID = newUUID.String()
						_, err = DB.Exec("INSERT INTO tests (id, title, description) VALUES ($1, $2, $3)",
							testID, testTitle, "ÖABT "+category+" Alan Bilgisi")
						if err != nil {
							log.Printf("Error creating test %s: %v", testTitle, err)
							_ = DB.QueryRow("SELECT id FROM tests WHERE title = $1", testTitle).Scan(&testID)
						}
					}
					currentTestID = testID
				}

				if currentTestID == "" {
					continue
				}

				qID, _ := uuid.NewV7()
				optionsJson, _ := json.Marshal(q.Options)
				solutionJson, _ := json.Marshal(q.Solution)
				metadataJson, _ := json.Marshal(q.Metadata)

				_, err = DB.Exec(`INSERT INTO questions 
					(id, test_id, question_id, category, subject, topic, sub_topic, difficulty, skill_level, text, options, solution, metadata, image_url, related_concept_id) 
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
					qID.String(), currentTestID, q.QuestionID, q.Category, q.Subject, q.Topic, q.SubTopic, q.Difficulty, q.SkillLevel, q.Text, optionsJson, solutionJson, metadataJson, q.ImageURL, q.RelatedConceptID)

				if err == nil {
					newQuestionsInFile++
					totalInserted++
				} else {
					log.Printf("Error inserting question %s from %s: %v", q.QuestionID, file.Name(), err)
				}
			}
			if newQuestionsInFile > 0 {
				fmt.Printf("Successfully seeded %d new questions from %s\n", newQuestionsInFile, file.Name())
			}
		}
	}
	fmt.Printf("Seeding complete. Total new questions added: %d\n", totalInserted)
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
