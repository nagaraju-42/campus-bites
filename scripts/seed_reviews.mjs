import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const fakeNames = [
  "Rahul S.", "Priya M.", "Amit Kumar", "Sneha R.", "Vikram Singh", 
  "Neha Sharma", "Rohan Gupta", "Kavita D.", "Anjali P.", "Karan V.", 
  "Divya T.", "Arjun N.", "Meera J.", "Siddharth B.", "Pooja K.", 
  "Manish C.", "Riya A.", "Aditya L.", "Swati Y.", "Tanya H.", 
  "Varun O.", "Shruti G.", "Aakash W.", "Nidhi S.", "Naveen P.",
  "Rakesh T.", "Simran K.", "Akshay R.", "Ishaan M.", "Ritika D.",
  "Sahil K.", "Ayesha F.", "Rahul Mehta", "Kabir S.", "Snehal P."
]

const positiveReviews = [
  "Absolutely amazing! The food was fresh and piping hot when it arrived.",
  "Best place on campus for late-night cravings. Highly recommended!",
  "Taste is consistently good. Portions are generous for the price.",
  "Really quick delivery and the packaging was completely spill-proof.",
  "One of my go-to places. Never disappoints!",
  "The spices were just right. Authentic flavor and great quantity.",
  "Super fast preparation. I always order from here during exams.",
  "Great value for money. The combo meals are highly recommended.",
  "Food was delicious and the ingredients tasted really fresh.",
  "10/10 would recommend. Literally my favorite spot right now.",
  "Always perfect. The best part is they follow the special instructions.",
  "Such a lifesaver when the mess food is bad. Totally worth it.",
  "I've ordered from here at least 5 times this month. Incredible taste.",
  "Perfectly cooked and perfectly seasoned. Loved it!",
  "A must-try! Everyone in my hostel orders from here.",
  "I am genuinely impressed by the quality. Taste is 100% on point.",
  "Way better than eating at the dining hall. Arrived exactly on time.",
  "Delicious! Hands down the best midnight snack I've had in a while."
]

const mixedReviews = [
  "Food is decent, but delivery took a little longer than expected today.",
  "Usually it's great, but today the fries were a bit soggy.",
  "Good food but portions could be a slightly bigger.",
  "Taste is fine, nothing extraordinary but completely worth the price.",
  "I like the food, but they forgot my extra ketchup packets.",
  "A bit too spicy for me, but my roommate loved it.",
  "It's okay for a quick bite. Not bad, not great."
]

function getRandomReview() {
  const isPositive = Math.random() < 0.85 // 85% positive
  const rating = isPositive ? (Math.random() < 0.5 ? 5 : 4) : 3
  
  const commentsArray = isPositive ? positiveReviews : mixedReviews
  const comment = commentsArray[Math.floor(Math.random() * commentsArray.length)]
  const fake_name = fakeNames[Math.floor(Math.random() * fakeNames.length)]
  
  return { rating, comment, fake_name }
}

async function run() {
  console.log("Starting review seeding...")
  // Get an admin or student ID to use as the base user
  const { data: users } = await supabase.from('profiles').select('id').limit(1)
  if (!users || users.length === 0) {
    console.log("No users found.")
    return
  }
  const studentId = users[0].id

  // Get all shops
  const { data: shops } = await supabase.from('shops').select('id, name')
  if (!shops) {
    console.log("No shops found.")
    return
  }

  for (const shop of shops) {
    // Generate between 20 and 26 reviews
    const numReviews = Math.floor(Math.random() * 7) + 20 
    console.log(`Seeding ${numReviews} reviews for shop: ${shop.name}`)
    
    const reviewsToInsert = []
    const now = new Date()
    
    for (let i = 0; i < numReviews; i++) {
      const reviewData = getRandomReview()
      const daysAgo = Math.floor(Math.random() * 30)
      const hoursAgo = Math.floor(Math.random() * 24)
      const created_at = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000)).toISOString()

      reviewsToInsert.push({
        shop_id: shop.id,
        student_id: studentId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        fake_name: reviewData.fake_name,
        created_at: created_at
      })
    }

    const { error } = await supabase.from('shop_reviews').insert(reviewsToInsert)
    if (error) {
      console.error(`Error inserting for ${shop.name}:`, error.message)
    }
  }
  
  console.log("Seeding complete!")
}

run()
