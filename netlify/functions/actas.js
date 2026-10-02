/**
 * Netlify Function: Manage Actas (Actas de Asistencia)
 * Conecta a Supabase para almacenar actas y documentos
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Handler principal para la función
exports.handler = async (event, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Manejar preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const supabase = getSupabaseClient();
    
    if (event.httpMethod === 'GET') {
      // GET /actas - Listar actas
      let query = supabase.from('actas').select(`
        id,
        fecha,
        tema,
        area,
        expositor,
        participantes,
        pdf_url
      `).order('fecha', { ascending: false });
      
      // Aplicar filtros opcionales desde query params
      const { fecha_inicio, fecha_fin, area, limite } = event.queryStringParameters || {};
      
      if (fecha_inicio) query = query.gte('fecha', fecha_inicio);
      if (fecha_fin) query = query.lte('fecha', fecha_fin);
      if (area) query = query.eq('area', area);
      if (limite) query = query.limit(parseInt(limite));
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data)
      };
    }

    if (event.httpMethod === 'POST') {
      // POST /actas - Crear nueva acta
      const actaData = JSON.parse(event.body);
      
      const { tema, area, expositor, participantes, fecha, hora_inicio, hora_fin } = actaData;
      
      // Validación básica
      if (!tema || !area || !expositor) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Campos requeridos: tema, area, expositor' 
          })
        };
      }
      
      // Insertar acta en la base de datos
      const { data: newActa, error } = await supabase
        .from('actas')
        .insert({
          tema,
          area,
          expositor,
          participantes: JSON.stringify(participantes || []),
          fecha,
          hora_inicio,
          hora_fin
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newActa)
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: `Método ${event.httpMethod} no permitido` })
    };
  } catch (error) {
    console.error('Error en función actas:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        detail: 'Error interno del servidor' 
      })
    };
  }
};