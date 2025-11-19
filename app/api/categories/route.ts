import { type NextRequest, NextResponse } from "next/server"

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

const DJANGO_API_URL = process.env.DJANGO_API_URL || "http://127.0.0.1:8000"

const CATEGORY_HIERARCHY: Record<string, string[]> = {
  "Building Materials": [
    "Cement & Concrete",
    "Sand, Gravel & Aggregates",
    "Bricks, Blocks & Masonry",
    "Steel & Metal Products",
    "Timber & Wood Products",
    "Roofing Materials",
    "Glass & Glazing",
    "Drywall, Plaster & Ceiling Boards",
  ],
  "Finishes & Interiors": [
    "Tiles & Flooring",
    "Paints & Coatings",
    "Wall Finishes",
    "Doors, Windows & Frames",
    "Interior Furniture & Fixtures",
    "Sanitaryware & Bathroom Fittings",
  ],
  "MEP (Mechanical, Electrical, Plumbing)": [
    "Plumbing & Pipes",
    "Electrical Materials",
    "HVAC Systems",
    "Water Supply & Pumps",
    "Gas Supply Systems",
  ],
  "Construction Chemicals": [
    "Concrete Admixtures",
    "Waterproofing Solutions",
    "Adhesives, Sealants & Grouts",
    "Protective Coatings",
    "Flooring Compounds",
  ],
  "Insulation & Energy": [
    "Thermal Insulation",
    "Acoustic Insulation",
    "Fireproofing Materials",
    "Solar & Renewable Energy Products",
  ],
  "Hardware & Tools": [
    "Hand Tools",
    "Power Tools",
    "Fasteners",
    "Measuring & Layout Tools",
    "Safety Materials",
  ],
  "Construction Equipment & Machinery": [
    "Earthmoving Equipment",
    "Concrete Equipment",
    "Material Handling",
    "Compaction Equipment",
    "Scaffolding & Formwork",
    "Generators & Compressors",
  ],
  "Site Essentials": [
    "Temporary Structures",
    "Safety & Signage",
    "Waste Management & Recycling",
    "Surveying Instruments",
  ],
}

function sanitizeAuthHeader(request: NextRequest) {
  const authorization = request.headers.get("authorization") || request.headers.get("Authorization")
  return authorization && authorization.trim().length > 0 ? authorization : null
}

async function forwardJsonResponse(response: Response) {
  const text = await response.text()
  let data: unknown

  try {
    data = text ? JSON.parse(text) : null
  } catch (error) {
    console.error("Failed to parse Django response as JSON:", error, text)
    data = { detail: text }
  }

  if (!response.ok) {
    return NextResponse.json({
      success: false,
      error: (data as any)?.error || (data as any)?.detail || "Request to Django API failed",
      details: data,
    }, { status: response.status })
  }

  return NextResponse.json(data, {
    status: response.status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    // Call Django API with cache busting
    const timestamp = new Date().getTime()
    const response = await fetch(`${DJANGO_API_URL}/api/categories/?t=${timestamp}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(sanitizeAuthHeader(request) ? { Authorization: sanitizeAuthHeader(request)! } : {}),
      },
      cache: 'no-store',
    })

    const data = await response.json()
    
    console.log('🔍 Django categories API response:', {
      count: Array.isArray(data) ? data.length : (data.results?.length || 0),
      firstCategory: Array.isArray(data) ? data[0] : data.results?.[0],
    })

    if (!response.ok) {
      console.error('Django API error:', response.status, data)
      return NextResponse.json({
        error: data?.error || "Failed to fetch categories",
        message: data?.message || "Please try again",
        success: false,
        categories: []
      }, { status: response.status })
    }

    const rawCategories = (() => {
      if (Array.isArray(data)) {
        return data
      }
      if (Array.isArray(data?.results)) {
        return data.results
      }
      if (Array.isArray(data?.categories)) {
        return data.categories
      }
      return []
    })()

    console.log('Categories API - Raw categories from Django:', rawCategories.length)

    type NormalizedCategory = {
      id: string
      name: string
      name_amharic?: string | null
      slug: string
      description?: string | null
      description_amharic?: string | null
      icon?: string | null
      category_images?: string[]
      product_count?: number
      parent_id: string | null
    }

    type CategoryEntry = {
      id: string
      name: string
      name_amharic?: string | null
      slug: string
      description?: string | null
      description_amharic?: string | null
      icon?: string | null
      category_images?: string[]
      product_count?: number
      parent_id: string | null
      subcategories: SubcategoryEntry[]
    }

    type SubcategoryEntry = {
      id: string
      name: string
      name_amharic?: string | null
      slug: string
      description?: string | null
      description_amharic?: string | null
      icon?: string | null
      category_images?: string[]
      product_count?: number
      parent_id: string
    }

    const rawList: NormalizedCategory[] = (rawCategories as Array<{
      id: string | number
      name: string
      name_amharic?: string | null
      slug: string
      description?: string | null
      description_amharic?: string | null
      icon?: string | null
      category_images?: string[]
      images?: string[]
      product_count?: number
      parent_id?: string | number | null
    }>).map((item) => ({
      id: String(item.id),
      name: item.name,
      name_amharic: item.name_amharic ?? null,
      slug: item.slug,
      description: item.description ?? null,
      description_amharic: item.description_amharic ?? null,
      icon: item.icon ?? null,
      category_images: Array.isArray(item.images)
        ? item.images
        : Array.isArray(item.category_images)
        ? item.category_images
        : [],
      product_count: item.product_count ?? 0,
      parent_id: item.parent_id !== null && item.parent_id !== undefined ? String(item.parent_id) : null,
    }))

    const categoriesByName = new Map<string, NormalizedCategory>()
    const categoriesById = new Map<string, NormalizedCategory>()
    const childrenByParentId = new Map<string, NormalizedCategory[]>()
    rawList.forEach((category) => {
      categoriesByName.set(category.name, category)
      categoriesById.set(category.id, category)

      if (category.parent_id) {
        const siblings = childrenByParentId.get(category.parent_id) ?? []
        siblings.push(category)
        childrenByParentId.set(category.parent_id, siblings)
      }
    })

    const usedCategoryIds = new Set<string>()
    const categoriesFromHierarchy: CategoryEntry[] = []

    Object.entries(CATEGORY_HIERARCHY).forEach(([parentName, childNames]) => {
      const parent = categoriesByName.get(parentName)
      if (!parent) {
        return
      }

      usedCategoryIds.add(parent.id)

      const subcategories: SubcategoryEntry[] = []

      childNames.forEach((childName) => {
        const child = categoriesByName.get(childName)
        if (!child) {
          return
        }

        usedCategoryIds.add(child.id)

        subcategories.push({
          id: child.id,
          name: child.name,
          name_amharic: child.name_amharic ?? null,
          slug: child.slug,
          description: child.description ?? null,
          description_amharic: child.description_amharic ?? null,
          icon: child.icon ?? null,
          category_images: child.category_images ?? [],
          product_count: child.product_count ?? 0,
          parent_id: parent.id,
        })
      })

      categoriesFromHierarchy.push({
        id: parent.id,
        name: parent.name,
        name_amharic: parent.name_amharic ?? null,
        slug: parent.slug,
        description: parent.description ?? null,
        description_amharic: parent.description_amharic ?? null,
        icon: parent.icon ?? null,
        category_images: parent.category_images ?? [],
        product_count: parent.product_count ?? 0,
        parent_id: null,
        subcategories,
      })
    })

    const finalCategories: CategoryEntry[] = [...categoriesFromHierarchy]

    rawList
      .filter((category) => !usedCategoryIds.has(category.id) && (category.parent_id === null || !categoriesById.has(category.parent_id)))
      .forEach((rootCategory) => {
        usedCategoryIds.add(rootCategory.id)

        const subcategories = (childrenByParentId.get(rootCategory.id) ?? [])
          .filter((child) => !usedCategoryIds.has(child.id))
          .map<SubcategoryEntry>((child) => {
            usedCategoryIds.add(child.id)
            return {
              id: child.id,
              name: child.name,
              name_amharic: child.name_amharic ?? null,
              slug: child.slug,
              description: child.description ?? null,
              description_amharic: child.description_amharic ?? null,
              icon: child.icon ?? null,
              category_images: child.category_images ?? [],
              product_count: child.product_count ?? 0,
              parent_id: rootCategory.id,
            }
          })

        finalCategories.push({
          id: rootCategory.id,
          name: rootCategory.name,
          name_amharic: rootCategory.name_amharic ?? null,
          slug: rootCategory.slug,
          description: rootCategory.description ?? null,
          description_amharic: rootCategory.description_amharic ?? null,
          icon: rootCategory.icon ?? null,
          category_images: rootCategory.category_images ?? [],
          product_count: rootCategory.product_count ?? 0,
          parent_id: null,
          subcategories,
        })
      })

    rawList
      .filter((category) => !usedCategoryIds.has(category.id))
      .forEach((category) => {
        usedCategoryIds.add(category.id)

        finalCategories.push({
          id: category.id,
          name: category.name,
          name_amharic: category.name_amharic ?? null,
          slug: category.slug,
          description: category.description ?? null,
          description_amharic: category.description_amharic ?? null,
          icon: category.icon ?? null,
          category_images: category.category_images ?? [],
          product_count: category.product_count ?? 0,
          parent_id: category.parent_id,
          subcategories: [],
        })
      })

    console.log('Categories API - Final categories:', finalCategories.length)
    console.log('Categories API - Sample IDs:', finalCategories.slice(0, 2).map(c => ({ name: c.name, id: c.id })))

    return NextResponse.json({
      success: true,
      categories: finalCategories,
      total: finalCategories.length,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error("Categories fetch error:", error)
    return NextResponse.json({
      error: "Internal server error",
      success: false,
      categories: []
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization = sanitizeAuthHeader(request)
    const contentType = request.headers.get('content-type') || ''

    let body: BodyInit | undefined
    let headers: HeadersInit = {
      ...(authorization ? { Authorization: authorization } : {}),
    }

    if (contentType.includes('application/json')) {
      const json = await request.json()
      body = JSON.stringify(json)
      headers = {
        ...headers,
        'Content-Type': 'application/json',
      }
    } else if (contentType.includes('multipart/form-data')) {
      const incomingFormData = await request.formData()
      const forwardFormData = new FormData()

      incomingFormData.forEach((value, key) => {
        if (typeof value === 'object' && value !== null && 'arrayBuffer' in value) {
          const blobValue = value as Blob
          const fileName = (value as { name?: string }).name || 'upload'
          forwardFormData.append(key, blobValue, fileName)
        } else {
          forwardFormData.append(key, String(value))
        }
      })

      body = forwardFormData
    } else {
      // Default to text
      const rawBody = await request.text()
      body = rawBody
      if (contentType) {
        headers = {
          ...headers,
          'Content-Type': contentType,
        }
      }
    }

    const djangoResponse = await fetch(`${DJANGO_API_URL}/api/categories/`, {
      method: 'POST',
      headers,
      body,
    })

    return await forwardJsonResponse(djangoResponse)
  } catch (error) {
    console.error('Categories POST proxy error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create category',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
