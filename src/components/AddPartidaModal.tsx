import React, { useState, useMemo } from 'react';
import { PartidaItem, MaterialItem, EquipmentItem, LaborItem } from '../types/costTypes';
import { TABULADOR_PETROLERO } from '../data/laborRates';
import { CATEGORIES } from '../data/itemsData';
import { abbreviateInsumoDesc, sanitizeCode } from '../utils/lulowinNormalizer';
import { X, Plus, Trash2, Copy, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddPartidaModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingItems: PartidaItem[];
  onAddPartida: (newPartida: PartidaItem) => void;
}

export const AddPartidaModal: React.FC<AddPartidaModalProps> = ({
  isOpen,
  onClose,
  existingItems,
  onAddPartida,
}) => {
  const nextId = existingItems.length + 1;

  // Clone source selector
  const [cloneSourceId, setCloneSourceId] = useState<number>(0);

  // Form states (Defaults to strict consecutive 3-digit zero-padded code)
  const [codPar, setCodPar] = useState<string>(String(nextId).padStart(3, '0'));
  const [codigoCovenin, setCodigoCovenin] = useState<string>(String(nextId).padStart(3, '0'));

  const [descripcion, setDescripcion] = useState<string>('');
  const [capitulo, setCapitulo] = useState<string>(CATEGORIES[1] || 'Obras Preliminares y Movimiento de Tierra');
  const [unidad, setUnidad] = useState<string>('M2');
  const [cantidad, setCantidad] = useState<number>(1);
  const [rendimiento, setRendimiento] = useState<number>(10);
  const [unidadRendimiento, setUnidadRendimiento] = useState<string>('M2/día');

  // APU Items
  const [materiales, setMateriales] = useState<MaterialItem[]>([]);
  const [equipos, setEquipos] = useState<EquipmentItem[]>([
    {
      codigo: 'ALB005',
      descripcion: abbreviateInsumoDesc('HERRAMIENTAS MENORES DE ALBAÑILERIA'),
      cantidad: 1,
      costo: 15.00,
      depreciacionOAlquiler: 1.0,
      total: 15.00,
    },
  ]);
  const [manoDeObra, setManoDeObra] = useState<LaborItem[]>([
    {
      codigo: '11-1-3',
      descripcion: abbreviateInsumoDesc('CAPORAL'),
      cantidad: 0.20,
      salarioDiario: 6.00,
      total: 1.20,
    },
    {
      codigo: '1-1-1',
      descripcion: abbreviateInsumoDesc('OBRERO DE 1RA'),
      cantidad: 1.00,
      salarioDiario: 3.50,
      total: 3.50,
    },
  ]);

  // Existing unique catalog options to facilitate reuse and duplicate consistency
  const existingMaterialCatalog = useMemo(() => {
    const map = new Map<string, { codigo: string; descripcion: string; unidad: string; costo: number }>();
    existingItems.forEach((it) => {
      it.apu.materiales.forEach((m) => {
        const key = m.descripcion.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, {
            codigo: sanitizeCode(m.codigo, 'M', 1),
            descripcion: abbreviateInsumoDesc(m.descripcion),
            unidad: m.unidad,
            costo: m.costoUnitario,
          });
        }
      });
    });
    return Array.from(map.values()).slice(0, 50); // Sample for dropdown
  }, [existingItems]);

  const existingEquipCatalog = useMemo(() => {
    const map = new Map<string, { codigo: string; descripcion: string; costo: number }>();
    existingItems.forEach((it) => {
      it.apu.equipos.forEach((e) => {
        const key = e.descripcion.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, {
            codigo: sanitizeCode(e.codigo, 'EQ', 1),
            descripcion: abbreviateInsumoDesc(e.descripcion),
            costo: e.costo,
          });
        }
      });
    });
    return Array.from(map.values()).slice(0, 30);
  }, [existingItems]);

  if (!isOpen) return null;

  // Clone handler
  const handleClonePartida = (sourceId: number) => {
    const source = existingItems.find((i) => i.id === sourceId);
    if (!source) return;

    setDescripcion(`[ANEXO] ${source.descripcion}`);
    setCapitulo(source.capitulo);
    setUnidad(source.unidad);
    setCantidad(source.cantidad);
    setRendimiento(source.apu.rendimiento);
    setUnidadRendimiento(source.apu.unidadRendimiento);
    setCodPar(sanitizeCode(`P${nextId}`, 'P', nextId));

    // Clone APU items with strict limits
    setMateriales(
      source.apu.materiales.map((m) => ({
        ...m,
        codigo: sanitizeCode(m.codigo, 'M', 1),
        descripcion: abbreviateInsumoDesc(m.descripcion),
      }))
    );
    setEquipos(
      source.apu.equipos.map((e) => ({
        ...e,
        codigo: sanitizeCode(e.codigo, 'EQ', 1),
        descripcion: abbreviateInsumoDesc(e.descripcion),
      }))
    );
    setManoDeObra(
      source.apu.manoDeObra.map((mo) => ({
        ...mo,
        codigo: sanitizeCode(mo.codigo, 'MO', 1),
        descripcion: abbreviateInsumoDesc(mo.descripcion),
      }))
    );
  };

  // Add Material Row
  const handleAddMaterialRow = () => {
    const defaultMat = existingMaterialCatalog[0] || {
      codigo: 'MAT001',
      descripcion: 'CEMENTO PORTLAND GRIS',
      unidad: 'SACO',
      costo: 8.50,
    };
    setMateriales((prev) => [
      ...prev,
      {
        codigo: defaultMat.codigo,
        descripcion: defaultMat.descripcion,
        unidad: defaultMat.unidad,
        cantidad: 1,
        desperdicioPorc: 5,
        costoUnitario: defaultMat.costo,
        total: defaultMat.costo * 1.05,
      },
    ]);
  };

  // Add Equipment Row
  const handleAddEquipRow = () => {
    const defaultEq = existingEquipCatalog[0] || {
      codigo: 'ALB001',
      descripcion: 'CARRETON P/VACIADO DE CONCRETO',
      costo: 68.00,
    };
    setEquipos((prev) => [
      ...prev,
      {
        codigo: defaultEq.codigo,
        descripcion: defaultEq.descripcion,
        cantidad: 1,
        costo: defaultEq.costo,
        depreciacionOAlquiler: 1.0,
        total: defaultEq.costo,
      },
    ]);
  };

  // Add Labor Row
  const handleAddLaborRow = () => {
    setManoDeObra((prev) => [
      ...prev,
      {
        codigo: '1-1-2',
        descripcion: 'AYUDANTE',
        cantidad: 1,
        salarioDiario: 3.60,
        total: 3.60,
      },
    ]);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      alert('Por favor ingrese la descripción de la nueva partida.');
      return;
    }

    // Sanitize all codes strictly to <= 6 chars
    const sanitizedCodPar = sanitizeCode(codPar, 'P', nextId);

    const newPartida: PartidaItem = {
      id: nextId,
      capitulo,
      codigoCovenin: sanitizedCodPar,
      descripcion: descripcion.trim(),
      unidad: unidad.trim().toUpperCase() || 'UND',
      cantidad: Math.max(0.01, cantidad),
      apu: {
        rendimiento: Math.max(0.01, rendimiento),
        unidadRendimiento: unidadRendimiento.trim() || `${unidad}/día`,
        materiales: materiales.map((m) => ({
          ...m,
          codigo: sanitizeCode(m.codigo, 'M', 1),
          descripcion: abbreviateInsumoDesc(m.descripcion),
          total: m.cantidad * m.costoUnitario * (1 + (m.desperdicioPorc || 0) / 100),
        })),
        equipos: equipos.map((eq) => ({
          ...eq,
          codigo: sanitizeCode(eq.codigo, 'EQ', 1),
          descripcion: abbreviateInsumoDesc(eq.descripcion),
          total: eq.cantidad * eq.costo * (eq.depreciacionOAlquiler || 1),
        })),
        manoDeObra: manoDeObra.map((mo) => ({
          ...mo,
          codigo: sanitizeCode(mo.codigo, 'MO', 1),
          descripcion: abbreviateInsumoDesc(mo.descripcion),
          total: mo.cantidad * mo.salarioDiario,
        })),
      },
      especificacion: {
        extensionTrabajo: `Comprende la ejecución técnica, suministro, logística e instalación requerida para la partida '${descripcion.trim()}', garantizando apego irrestricto a normas PDVSA y especificaciones de campo.`,
        procedimientoEjecucion: `Se ejecutará conforme a la buena práctica de ingeniería civil y petrolera, verificando niveles, alineaciones, tolerancias y cumpliendo con las directrices del Ingeniero Inspector.`,
        toleranciasAceptacion: 'Alineación milimétrica y acabados continuos sin fisuras ni desprendimientos.',
        ensayosARealizar: 'Inspección visual continua, ensayos no destructivos y pruebas operativas según aplique.',
        desperdicioMaximo: '5% máximo en materiales.',
        planos: 'Planos de detalle arquitectónico y especificaciones de ingeniería PDVSA.',
        condicionesEspeciales: 'Cumplimiento estricto de normativas SIHO-PDVSA, permisos de trabajo en frío/caliente y uso de EPP.',
        medidaYFormaPago: `La medida se realizará por unidad contractualmente ejecutada (${unidad.trim().toUpperCase()}) y recibida a entera satisfacción por la Inspección PDVSA.`,
        noConformidad: 'Cualquier anomalía o desviación de diseño obligará al contratista a corregir o reponer los elementos sin costo adicional para PDVSA.',
      },
    };

    onAddPartida(newPartida);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-300 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-xs bg-emerald-600 px-2.5 py-0.5 rounded text-white tracking-wide">
              NUEVA PARTIDA N° {nextId}
            </span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Anexar Partida al Partidario Oficial (LuloWin)
              </h3>
              <p className="text-[11px] text-slate-400">
                Las 363 partidas oficiales permanecen intactas. Se anexa la nueva información con códigos ≤ 6 caracteres.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Clone Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Copy className="w-4 h-4 text-slate-500" />
            <span className="font-semibold">Plantilla Rápida (Clonar Partida):</span>
            <select
              value={cloneSourceId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setCloneSourceId(id);
                if (id > 0) handleClonePartida(id);
              }}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value={0}>-- Seleccionar partida como base para clonar --</option>
              {existingItems.slice(0, 100).map((it) => (
                <option key={it.id} value={it.id}>
                  Partida {it.id}: Código {String(it.id).padStart(3, '0')} - {it.descripcion.substring(0, 40)}...
                </option>
              ))}

            </select>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Total actual: {existingItems.length} partidas
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Section 1: Basic Partida Metadata */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>1. Identificación de la Partida</span>
              <span className="text-[10px] text-slate-500 font-normal">
                Códigos estrictamente ≤ 6 caracteres
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Código Partida (CodPar) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={codPar}
                    onChange={(e) => setCodPar(e.target.value.toUpperCase())}
                    placeholder="Ej. P00267"
                    className="w-full font-mono uppercase bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">
                    {codPar.length}/6
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Unidad de Medida (UniPar)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={unidad}
                  onChange={(e) => {
                    const u = e.target.value.toUpperCase();
                    setUnidad(u);
                    setUnidadRendimiento(`${u}/día`);
                  }}
                  className="w-full font-mono uppercase bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cantidad Oficial (CanPar)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-full font-mono bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rendimiento Diario (RenPar)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={rendimiento}
                    onChange={(e) => setRendimiento(Number(e.target.value))}
                    className="w-1/2 font-mono bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <input
                    type="text"
                    value={unidadRendimiento}
                    onChange={(e) => setUnidadRendimiento(e.target.value)}
                    className="w-1/2 font-mono bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Capítulo / Categoría
                </label>
                <select
                  value={capitulo}
                  onChange={(e) => setCapitulo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  {CATEGORIES.filter((c) => c !== 'Todos').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Descripción Completa de la Partida <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ingrese la descripción detallada de los trabajos a ejecutar..."
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Section 2: Materiales */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <span>2. Materiales (ObraMate / ObraApinMate)</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  (Descri ≤ 54 caracteres, CodIns ≤ 6)
                </span>
              </h4>
              <button
                type="button"
                onClick={handleAddMaterialRow}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Agregar Material</span>
              </button>
            </div>

            {materiales.length === 0 ? (
              <p className="text-slate-400 italic py-1">No hay materiales cargados (partida solo mano de obra/equipos).</p>
            ) : (
              <div className="space-y-2">
                {materiales.map((m, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded border border-slate-200">
                    <div className="col-span-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={m.codigo}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setMateriales((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, codigo: val } : item))
                          );
                        }}
                        placeholder="Cod"
                        className="w-full font-mono uppercase bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                      />
                    </div>
                    <div className="col-span-4 relative">
                      <input
                        type="text"
                        maxLength={54}
                        value={m.descripcion}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMateriales((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, descripcion: val } : item))
                          );
                        }}
                        placeholder="Descripción (máx 54 car)"
                        className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                      />
                      <span className="absolute right-1 top-1 text-[9px] text-slate-400 font-mono">
                        {m.descripcion.length}/54
                      </span>
                    </div>
                    <div className="col-span-1">
                      <input
                        type="text"
                        maxLength={5}
                        value={m.unidad}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setMateriales((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, unidad: val } : item))
                          );
                        }}
                        className="w-full text-center font-mono uppercase bg-slate-50 border border-slate-300 rounded px-1 py-1 text-[11px]"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={m.cantidad}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMateriales((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, cantidad: val } : item))
                          );
                        }}
                        placeholder="Cant."
                        className="w-full font-mono bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        value={m.costoUnitario}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMateriales((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, costoUnitario: val } : item))
                          );
                        }}
                        placeholder="Costo"
                        className="w-full font-mono bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setMateriales((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Equipos */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <span>3. Equipos (ObraEqui / ObraApinEqui)</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  (CodeEqu ≤ 6, Descri ≤ 54)
                </span>
              </h4>
              <button
                type="button"
                onClick={handleAddEquipRow}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Agregar Equipo</span>
              </button>
            </div>

            <div className="space-y-2">
              {equipos.map((eq, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded border border-slate-200">
                  <div className="col-span-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={eq.codigo}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setEquipos((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, codigo: val } : item))
                        );
                      }}
                      placeholder="Cod"
                      className="w-full font-mono uppercase bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                    />
                  </div>
                  <div className="col-span-5 relative">
                    <input
                      type="text"
                      maxLength={54}
                      value={eq.descripcion}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEquipos((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, descripcion: val } : item))
                        );
                      }}
                      placeholder="Descripción (máx 54 car)"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                    />
                    <span className="absolute right-1 top-1 text-[9px] text-slate-400 font-mono">
                      {eq.descripcion.length}/54
                    </span>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="1"
                      value={eq.cantidad}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEquipos((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, cantidad: val } : item))
                        );
                      }}
                      placeholder="Cant"
                      className="w-full font-mono bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      value={eq.costo}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEquipos((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, costo: val } : item))
                        );
                      }}
                      placeholder="Costo"
                      className="w-full font-mono bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setEquipos((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Mano de Obra */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <span>4. Mano de Obra CCP / LOTTT (ObraMano / ObraApinMano)</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  (CodMan ≤ 6, Descri ≤ 54)
                </span>
              </h4>
              <button
                type="button"
                onClick={handleAddLaborRow}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Agregar Mano de Obra</span>
              </button>
            </div>

            <div className="space-y-2">
              {manoDeObra.map((mo, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded border border-slate-200">
                  <div className="col-span-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={mo.codigo}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setManoDeObra((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, codigo: val } : item))
                        );
                      }}
                      placeholder="Cod"
                      className="w-full font-mono uppercase bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                    />
                  </div>
                  <div className="col-span-5 relative">
                    <input
                      type="text"
                      maxLength={54}
                      value={mo.descripcion}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManoDeObra((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, descripcion: val } : item))
                        );
                      }}
                      placeholder="Categoría (máx 54 car)"
                      className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                    />
                    <span className="absolute right-1 top-1 text-[9px] text-slate-400 font-mono">
                      {mo.descripcion.length}/54
                    </span>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.05"
                      value={mo.cantidad}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setManoDeObra((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, cantidad: val } : item))
                        );
                      }}
                      placeholder="Cant"
                      className="w-full font-mono bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      value={mo.salarioDiario}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setManoDeObra((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, salarioDiario: val } : item))
                        );
                      }}
                      placeholder="Salario"
                      className="w-full font-mono bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[11px]"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setManoDeObra((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Anexar Partida al Partidario</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
