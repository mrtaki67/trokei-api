import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding ...')

  const categories = [
    // Itens Pessoais e de Lazer
    'Eletrônicos',
    'Móveis',
    'Vestuário',
    'Livros e Revistas',
    'Brinquedos e Jogos',
    'Esportes e Lazer',
    'Saúde e Beleza',
    'Instrumentos Musicais',
    'Arte e Antiguidades',
    // Casa e Jardim
    'Casa e Decoração',
    'Instrumentos Musicais',
    'Eletrodomésticos',
    'Ferramentas e Construção',
    'Jardinagem',
    // Outros
    'Itens para Pet',
    'Veículos e Acessórios',
    'Arte e Antiguidades',
    'Bebês e Crianças',
    'Saúde e Beleza',
    'Serviços e Aulas',
    'Outros',
  ]

  for (const categoryName of categories) {
    await prisma.categoria.upsert({
      where: { nome: categoryName },
      update: {},
      create: {
        nome: categoryName,
      },
    })
  }

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
